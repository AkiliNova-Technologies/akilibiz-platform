import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

import authReducer from './slices/authSlice';
import productsReducer from './slices/productsSlice';
import categoriesReducer from './slices/categoriesSlice';
import customersReducer from './slices/customersSlice';
import salesReducer from './slices/salesSlice';
import inventoryReducer from './slices/inventorySlice';
import cartReducer from './slices/cartSlice';
import reportsReducer from './slices/reportsSlice';
import staffReducer from './slices/staffSlice';
import settingsReducer from './slices/settingsSlice';
import suppliersReducer from './slices/suppliersSlice';
import supplierPaymentsReducer from './slices/supplierPaymentsSlice';
import purchaseOrdersReducer from './slices/purchaseOrdersSlice';
import rolesPermissionsReducer from './slices/rolesPermissionsSlice';
import activityLogsReducer from './slices/activityLogsSlice';
import financeReducer from './slices/financeSlice';
import dashboardReducer from './slices/dashboardSlice';
import onboardingReducer from './slices/onboardingSlice';
import importExportReducer from './slices/importExportSlice';
import creditRiskReducer from "./slices/creditRiskSlice";
import taxReducer from "./slices/taxSlice"; 
import notificationsReducer from "./slices/notificationsSlice";
import localeReducer from "./slices/localeSlice";


const safeStorage = {
  getItem: (key: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return Promise.resolve(window.localStorage.getItem(key));
      }
      return Promise.resolve(null);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return Promise.resolve();
    } catch (error) {
      console.error('Storage setItem error:', error);
      return Promise.resolve();
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return Promise.resolve();
    } catch (error) {
      console.error('Storage removeItem error:', error);
      return Promise.resolve();
    }
  },
};

// Persist configs with safe storage
const authPersistConfig = {
  key: 'auth',
  storage: safeStorage, // Use safe storage instead of direct import
  whitelist: ['user', 'accessToken'],
};

const cartPersistConfig = {
  key: 'cart',
  storage: safeStorage,
  whitelist: ['items'],
};
const localePersistConfig = { key: 'locale', storage: safeStorage, whitelist: ['locale'] };

// Create persisted reducers
const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedCartReducer = persistReducer(cartPersistConfig, cartReducer);
const persistedLocaleReducer = persistReducer(localePersistConfig, localeReducer);

// Combine all reducers
const rootReducer = combineReducers({
  auth: persistedAuthReducer,
  cart: persistedCartReducer,
  products: productsReducer,
  categories: categoriesReducer,
  customers: customersReducer,
  sales: salesReducer,
  inventory: inventoryReducer,
  reports: reportsReducer,
  staff: staffReducer,
  settings: settingsReducer,
  suppliers: suppliersReducer,
  supplierPayments: supplierPaymentsReducer,
  purchaseOrders: purchaseOrdersReducer,
  rolesPermissions: rolesPermissionsReducer,
  activityLogs: activityLogsReducer,
  finance: financeReducer,
  dashboard: dashboardReducer,
  onboarding: onboardingReducer,
  importExport: importExportReducer,
  creditRisk: creditRiskReducer,
  tax: taxReducer,
  notifications: notificationsReducer,
  locale: persistedLocaleReducer,
});

// Create store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.MODE !== 'production',
});

export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
