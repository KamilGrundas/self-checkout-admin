import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type Language = "en" | "pl"

type TranslationKey = keyof typeof translations.en

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
}

export type TFunction = I18nContextValue["t"]

const STORAGE_KEY = "self-checkout-admin-language"

const translations = {
  en: {
    actions: "Actions",
    addCategory: "Add Category",
    addCounter: "Add Counter",
    addProduct: "Add Product",
    admin: "Admin",
    cancel: "Cancel",
    catalogDashboard: "Catalog dashboard",
    categories: "Categories",
    categoriesDescription:
      "Manage product groups used by the checkout catalog.",
    category: "Category",
    categoryCreated: "Category created successfully",
    categoryDeleted: "Category deleted successfully",
    categoryDeleteDescription:
      "This category can only be deleted if no products use it.",
    categoryDescription:
      "Create a product category used by the checkout catalog.",
    categoryNameRequired: "Category name is required",
    categoryUpdated: "Category updated successfully",
    checkoutCounters: "Checkout counters",
    checkoutCountersDescription:
      "Manage self-checkout kiosks and keep their connection IDs available.",
    counter: "Counter",
    counterCreated: "Checkout counter created successfully",
    counterDeleted: "Checkout counter deleted successfully",
    counterDeleteDescription:
      "This checkout counter will be permanently removed.",
    counterDescription:
      "Create a self-checkout kiosk credential used by the client app.",
    counterNameRequired: "Counter name is required",
    counterUpdated: "Checkout counter updated successfully",
    createdAt: "Created at",
    dashboard: "Dashboard",
    defaultCategory: "Default",
    defaultCategoryLocked: "Default category",
    deleteCategory: "Delete Category",
    deleteCounter: "Delete Counter",
    deleteProduct: "Delete Product",
    editCategory: "Edit Category",
    editCounter: "Edit Counter",
    editProduct: "Edit Product",
    id: "ID",
    image: "Image",
    imageReady: "Image ready",
    key: "Key",
    language: "Language",
    name: "Name",
    newPassword: "New password",
    newPasswordHelp: "Leave empty to keep the current password.",
    noCategories: "No categories yet",
    noCategoriesDescription: "Add a category before organizing products.",
    noCounters: "No checkout counters yet",
    noCountersDescription: "Add a counter before configuring the kiosk client.",
    noImage: "No image",
    noProducts: "No products yet",
    noProductsDescription:
      "Add the first product to start building the catalog.",
    password: "Password",
    passwordRequired: "Password is required",
    price: "Price",
    priceRequired: "Price is required",
    productCatalogDescription:
      "Manage product names, prices, units, categories and images.",
    productCreated: "Product created successfully",
    productDeleted: "Product deleted successfully",
    productDeleteDescription:
      "This product will be permanently removed from the catalog.",
    productDescription:
      "Add a product that can be sold at the self-checkout kiosk.",
    productGroupsDescription:
      "Maintain catalog groups used by products and the kiosk client.",
    productNameRequired: "Product name is required",
    productUpdated: "Product updated successfully",
    products: "Products",
    productsDescription: "Manage prices, units, images and product categories.",
    replaceImage: "Replace image",
    save: "Save",
    selectCategory: "Select category",
    selectUnit: "Select unit",
    accountDeletedSuccessfully: "Your account has been successfully deleted",
    appearance: "Appearance",
    changePassword: "Change Password",
    confirm: "Confirm",
    confirmationRequired: "Confirmation Required",
    confirmPassword: "Confirm Password",
    currentPassword: "Current Password",
    dangerZone: "Danger zone",
    dark: "Dark",
    delete: "Delete",
    deleteAccount: "Delete Account",
    deleteAccountConfirmDescription:
      "All your account data will be permanently deleted. If you are sure, please click Confirm to proceed. This action cannot be undone.",
    deleteAccountDescription:
      "Permanently delete your account and all associated data.",
    edit: "Edit",
    email: "Email",
    fullName: "Full name",
    light: "Light",
    logOut: "Log Out",
    myProfile: "My profile",
    passwordConfirmationRequired: "Password confirmation is required",
    passwordMinLength: "Password must be at least 8 characters",
    passwordsDoNotMatch: "The passwords don't match",
    passwordUpdatedSuccessfully: "Password updated successfully",
    preferences: "Preferences",
    signedInAs: "Signed in as",
    status: "Status",
    system: "System",
    unit: "Unit",
    updateCategoryDescription: "Update category details below.",
    updateCounterDescription: "Update checkout counter details below.",
    updateProductDescription: "Update product details below.",
    updatePassword: "Update Password",
    useBackendDefaultCategory: "Use backend default category",
    userInformation: "User Information",
    userSettings: "User Settings",
    userSettingsDescription: "Manage your account settings and preferences",
    userUpdatedSuccessfully: "User updated successfully",
  },
  pl: {
    actions: "Akcje",
    addCategory: "Dodaj kategorię",
    addCounter: "Dodaj kasę",
    addProduct: "Dodaj produkt",
    admin: "Admin",
    cancel: "Anuluj",
    catalogDashboard: "Panel katalogu",
    categories: "Kategorie",
    categoriesDescription:
      "Zarządzaj grupami produktów używanymi w katalogu kasy.",
    category: "Kategoria",
    categoryCreated: "Kategoria została utworzona",
    categoryDeleted: "Kategoria została usunięta",
    categoryDeleteDescription:
      "Kategorię można usunąć tylko wtedy, gdy nie używa jej żaden produkt.",
    categoryDescription:
      "Utwórz kategorię produktów używaną przez katalog kasy.",
    categoryNameRequired: "Nazwa kategorii jest wymagana",
    categoryUpdated: "Kategoria została zaktualizowana",
    checkoutCounters: "Kasy samoobsługowe",
    checkoutCountersDescription:
      "Zarządzaj kasami samoobsługowymi i ich identyfikatorami połączenia.",
    counter: "Kasa",
    counterCreated: "Kasa samoobsługowa została utworzona",
    counterDeleted: "Kasa samoobsługowa została usunięta",
    counterDeleteDescription: "Ta kasa samoobsługowa zostanie trwale usunięta.",
    counterDescription:
      "Utwórz dane dostępowe kasy samoobsługowej używane przez aplikację klienta.",
    counterNameRequired: "Nazwa kasy jest wymagana",
    counterUpdated: "Kasa samoobsługowa została zaktualizowana",
    createdAt: "Utworzono",
    dashboard: "Panel",
    defaultCategory: "Domyślna",
    defaultCategoryLocked: "Kategoria domyślna",
    deleteCategory: "Usuń kategorię",
    deleteCounter: "Usuń kasę",
    deleteProduct: "Usuń produkt",
    editCategory: "Edytuj kategorię",
    editCounter: "Edytuj kasę",
    editProduct: "Edytuj produkt",
    id: "ID",
    image: "Obraz",
    imageReady: "Obraz gotowy",
    key: "Klucz",
    language: "Język",
    name: "Nazwa",
    newPassword: "Nowe hasło",
    newPasswordHelp: "Zostaw puste, aby zachować obecne hasło.",
    noCategories: "Brak kategorii",
    noCategoriesDescription: "Dodaj kategorię przed organizacją produktów.",
    noCounters: "Brak kas samoobsługowych",
    noCountersDescription: "Dodaj kasę przed konfiguracją aplikacji klienta.",
    noImage: "Brak obrazu",
    noProducts: "Brak produktów",
    noProductsDescription:
      "Dodaj pierwszy produkt, aby zacząć budować katalog.",
    password: "Hasło",
    passwordRequired: "Hasło jest wymagane",
    price: "Cena",
    priceRequired: "Cena jest wymagana",
    productCatalogDescription:
      "Zarządzaj nazwami, cenami, jednostkami, kategoriami i obrazami produktów.",
    productCreated: "Produkt został utworzony",
    productDeleted: "Produkt został usunięty",
    productDeleteDescription:
      "Ten produkt zostanie trwale usunięty z katalogu.",
    productDescription:
      "Dodaj produkt, który może być sprzedawany w kasie samoobsługowej.",
    productGroupsDescription:
      "Utrzymuj grupy katalogu używane przez produkty i aplikację kasy.",
    productNameRequired: "Nazwa produktu jest wymagana",
    productUpdated: "Produkt został zaktualizowany",
    products: "Produkty",
    productsDescription:
      "Zarządzaj cenami, jednostkami, obrazami i kategoriami produktów.",
    replaceImage: "Zastąp obraz",
    save: "Zapisz",
    selectCategory: "Wybierz kategorię",
    selectUnit: "Wybierz jednostkę",
    accountDeletedSuccessfully: "Twoje konto zostało pomyślnie usunięte",
    appearance: "Wygląd",
    changePassword: "Zmień hasło",
    confirm: "Potwierdź",
    confirmationRequired: "Wymagane potwierdzenie",
    confirmPassword: "Potwierdź hasło",
    currentPassword: "Aktualne hasło",
    dangerZone: "Strefa niebezpieczna",
    dark: "Ciemny",
    delete: "Usuń",
    deleteAccount: "Usuń konto",
    deleteAccountConfirmDescription:
      "Wszystkie dane konta zostaną trwale usunięte. Jeśli jesteś pewny, kliknij Potwierdź, aby kontynuować. Tej operacji nie można cofnąć.",
    deleteAccountDescription:
      "Trwale usuń swoje konto i wszystkie powiązane dane.",
    edit: "Edytuj",
    email: "Email",
    fullName: "Imię i nazwisko",
    light: "Jasny",
    logOut: "Wyloguj",
    myProfile: "Mój profil",
    passwordConfirmationRequired: "Potwierdzenie hasła jest wymagane",
    passwordMinLength: "Hasło musi mieć co najmniej 8 znaków",
    passwordsDoNotMatch: "Hasła nie są zgodne",
    passwordUpdatedSuccessfully: "Hasło zostało zaktualizowane",
    preferences: "Preferencje",
    signedInAs: "Zalogowano jako",
    status: "Status",
    system: "Systemowy",
    unit: "Jednostka",
    updateCategoryDescription: "Zaktualizuj szczegóły kategorii.",
    updateCounterDescription: "Zaktualizuj szczegóły kasy samoobsługowej.",
    updateProductDescription: "Zaktualizuj szczegóły produktu.",
    updatePassword: "Zaktualizuj hasło",
    useBackendDefaultCategory: "Użyj domyślnej kategorii backendu",
    userInformation: "Informacje o użytkowniku",
    userSettings: "Ustawienia użytkownika",
    userSettingsDescription: "Zarządzaj ustawieniami konta i preferencjami",
    userUpdatedSuccessfully: "Dane użytkownika zostały zaktualizowane",
  },
} as const

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

function getInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "en"
  }

  const storedLanguage = window.localStorage.getItem(STORAGE_KEY)
  return storedLanguage === "pl" ? "pl" : "en"
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language)
  }, [language])

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => translations[language][key],
    }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider")
  }
  return context
}
