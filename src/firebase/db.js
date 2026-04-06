import { db, auth } from './config';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp, getDoc, getDocs, writeBatch, increment, orderBy, limit } from 'firebase/firestore';

// Categories
export const subscribeToCategories = (userId, onUpdate) => {
  if (!userId) return () => {};
  const q = query(collection(db, 'categories'), where('userId', '==', userId));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const categories = [];
    snapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    onUpdate(categories);
  }, (error) => {
    console.error("Error subscribing to categories:", error);
  });
  return unsubscribe;
};

export const addCategory = async (userId, data) => {
  try {
    const docRef = await addDoc(collection(db, 'categories'), {
      ...data,
      userId,
      createdAt: serverTimestamp(),
      count: 0,
      status: 'optimal'
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding category: ", error);
    return { success: false, error: error.message };
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: error.message };
  }
};

// Items
export const subscribeToItems = (categoryId, onUpdate) => {
  if (!categoryId) return () => {};
  const q = query(collection(db, 'items'), where('categoryId', '==', categoryId));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const items = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    onUpdate(items);
  }, (error) => {
    console.error("Error subscribing to items:", error);
  });
  return unsubscribe;
};

export const addItem = async (categoryId, data) => {
  try {
    const itemsRef = collection(db, 'items');
    const categoryRef = doc(db, 'categories', categoryId);
    
    let status = 'optimal';
    const currentQty = Number(data.quantity);
    const minLevel = Number(data.minStockLevel);
    
    if (currentQty === 0) status = 'out';
    else if (currentQty <= minLevel) status = 'low';

    const newItem = {
      ...data,
      quantity: currentQty,
      minStockLevel: minLevel,
      categoryId,
      userId: auth.currentUser?.uid, // Added userId for direct querying
      createdAt: serverTimestamp(),
      status
    };

    const batch = writeBatch(db);
    const newDocRef = doc(itemsRef);
    batch.set(newDocRef, newItem);
    batch.update(categoryRef, { count: increment(1) });
    
    await batch.commit();
    return { success: true, id: newDocRef.id };
  } catch (error) {
    console.error("Error adding item: ", error);
    return { success: false, error: error.message };
  }
};

export const deleteItem = async (categoryId, itemId) => {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    const itemRef = doc(db, 'items', itemId);
    
    const batch = writeBatch(db);
    batch.delete(itemRef);
    batch.update(categoryRef, { count: increment(-1) });
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error deleting item:", error);
    return { success: false, error: error.message };
  }
};

export const getCategoryDetails = async (categoryId) => {
  try {
    const docRef = doc(db, 'categories', categoryId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Category not found' };
    }
  } catch (error) {
    console.error("Error getting category: ", error);
    return { success: false, error: error.message };
  }
};

// Stock Operations & Transactions
export const adjustStock = async (categoryId, itemId, amount, operationType, note, userId) => {
  try {
    const itemRef = doc(db, 'items', itemId);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) return { success: false, error: "Item not found." };
    
    const itemData = itemSnap.data();
    const currentQty = itemData.quantity || 0;
    const minLevel = itemData.minStockLevel || 0;
    
    let newQty = currentQty;
    if (operationType === 'add') {
      newQty += amount;
    } else if (operationType === 'use') {
      newQty -= amount;
      if (newQty < 0) return { success: false, error: "Cannot use more stock than is currently available." };
    }
    
    let status = 'optimal';
    if (newQty === 0) status = 'out';
    else if (newQty <= minLevel) status = 'low';
    
    const batch = writeBatch(db);
    batch.update(itemRef, { quantity: newQty, status });
    
    // Log the transaction
    const transactionRef = doc(collection(db, 'transactions'));
    batch.set(transactionRef, {
      itemId,
      itemName: itemData.name,
      unit: itemData.unit || '',
      categoryId,
      userId,
      operationType,
      amount,
      previousQuantity: currentQty,
      newQuantity: newQty,
      note: note || '',
      createdAt: serverTimestamp()
    });
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return { success: false, error: error.message };
  }
};

// Subscriptions for Alerts & Reports
export const subscribeToTransactions = (userId, onUpdate) => {
  if (!userId) return () => {};
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const transactions = [];
    snapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });
    onUpdate(transactions);
  });
};

export const subscribeToAlerts = (userId, onUpdate) => {
  if (!userId) return () => {};
  // First get category IDs for this user
  const catQuery = query(collection(db, 'categories'), where('userId', '==', userId));
  
  return onSnapshot(catQuery, (catSnapshot) => {
    const categoryIds = catSnapshot.docs.map(doc => doc.id);
    const categoryMap = {}; // To enrich alerts with category names
    catSnapshot.docs.forEach(doc => {
      categoryMap[doc.id] = doc.data();
    });

    if (categoryIds.length === 0) {
      onUpdate([]);
      return;
    }

    // Query items in batches of 10 for 'in' operator if needed, 
    // but for now let's use the new userId field on items for simplicity where possible.
    // Since existing items don't have userId, we'll try to find items for these categories.
    const itemQuery = query(
      collection(db, 'items'),
      where('categoryId', 'in', categoryIds.slice(0, 10)), // Limit to first 10 categories for 'in'
      where('status', 'in', ['low', 'out'])
    );

    return onSnapshot(itemQuery, (itemSnapshot) => {
      const alerts = [];
      itemSnapshot.forEach((doc) => {
        const itemData = doc.data();
        alerts.push({ 
          id: doc.id, 
          ...itemData,
          categoryName: categoryMap[itemData.categoryId]?.name,
          categoryColor: categoryMap[itemData.categoryId]?.color
        });
      });
      onUpdate(alerts);
    });
  });
};
export const subscribeToCategoryTransactions = (categoryId, onUpdate) => {
  if (!categoryId) return () => {};
  const q = query(
    collection(db, 'transactions'),
    where('categoryId', '==', categoryId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const transactions = [];
    snapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });
    onUpdate(transactions);
  });
};
export const getAllUserItems = async (userId) => {
  if (!userId) return { success: false, error: 'User ID required' };
  try {
    const q = query(collection(db, 'items'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const items = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("Error getting all user items:", error);
    return { success: false, error: error.message };
  }
};
