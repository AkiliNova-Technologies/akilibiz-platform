import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/theme-context";
import { I18nProvider } from "@/i18n/provider";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/redux/store";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <HashRouter>
        <I18nProvider><ThemeProvider><App /></ThemeProvider></I18nProvider>
      </HashRouter>
    </PersistGate>
  </Provider>
);
