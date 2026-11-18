/**
 * app/settings.tsx — Modal de Configuración
 * Diseño: lista agrupada (Card + SectionHeader + ListRow + Divider) sobre la capa
 * aditiva de tokens (src/theme/tokens.ts) — puerto del patrón "menú de Ajustes" de
 * Habit Tracker. Header de pantalla apilada (StackedScreenHeader) en vez de header
 * nativo, título grande en el body.
 *
 * Cada sección vive en su propio archivo bajo src/components/settings/ (dividido en
 * la Fase 3 de la auditoría de arquitectura, 2026-11-17): este archivo es solo el
 * orquestador de la ruta, con el estado de qué hoja está abierta y los handlers que
 * cruzan secciones (ej. editar categoría abre un modal fuera de CategoriesSheet).
 */
import { AccountSection } from "@/src/components/ui/AccountSection";
import { Card, SectionHeader, Divider } from "@/src/components/ui/Card";
import { DefaultPeriodSheet } from "@/src/components/ui/DefaultPeriodSheet";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Enter } from "@/src/components/ui/Enter";
import { ListRow } from "@/src/components/ui/ListRow";
import { StackedScreenHeader } from "@/src/components/ui/StackedScreenHeader";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { DEFAULT_LIST_ID } from "@/src/constants/lists";
import { type UserCategory } from "@/src/constants/categoryPresets";
import { useTheme } from "@/src/context/ThemeContext";
import { requestNotificationPermissions } from "@/src/services/notificationService";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { ListsSheet } from "@/src/components/ui/ListsSheet";
import { useShareActiveList } from "@/src/hooks/useActiveListShare";
import { useCsvTransfer, type ImportResult } from "@/src/hooks/useCsvTransfer";
import { useListEditor } from "@/src/hooks/useListEditor";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useAppTokens } from "@/src/theme/tokens";
import Constants from "expo-constants";
import { router } from "expo-router";
import {
  CreditCard,
  Download,
  Eye,
  HandCoins,
  Info,
  Layers,
  LayoutGrid,
  Moon,
  PiggyBank,
  Share2,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AutoDetectSection } from "@/src/components/settings/AutoDetectSection";
import { BiometricLockRow } from "@/src/components/settings/BiometricLockRow";
import {
  BudgetAlertSection,
  CategoriesSheet,
  EditCategoryModal,
} from "@/src/components/settings/CategoriesSection";
import { DEBT_COLOR } from "@/src/components/settings/DebtsSection";
import { CommitmentsSection } from "@/src/components/settings/CommitmentsSection";
import { PaymentMethodsSection } from "@/src/components/settings/PaymentMethodsSection";
import { InputModal, SelectorModal, SettingsSheet } from "@/src/components/settings/SettingsShared";
import { catSheet } from "@/src/components/settings/settingsStyles";

// ─── Constantes ───────────────────────────────────────────────────────────────
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCOP(value: number): string {
  if (value <= 0) return "Sin configurar";
  return `$ ${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")} COP`;
}

// ─── Screen principal ─────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const theme = useTheme();
  const tokens = useAppTokens();
  const insets = useSafeAreaInsets();

  const darkMode = useSettingsStore((s) => s.darkMode);
  const budgetByCategory = useSettingsStore((s) => s.budgetByCategory);
  const userCategories = useSettingsStore((s) => s.userCategories);

  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const setBudgetForCategory = useSettingsStore((s) => s.setBudgetForCategory);
  const removeBudgetForCategory = useSettingsStore((s) => s.removeBudgetForCategory);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const budgetAlertsEnabled = useSettingsStore((s) => s.budgetAlertsEnabled);
  const budgetAlertThreshold = useSettingsStore((s) => s.budgetAlertThreshold);
  const setBudgetAlertsEnabled = useSettingsStore((s) => s.setBudgetAlertsEnabled);

  // Handler: al activar alertas de presupuesto, validar permiso de notificaciones
  const handleBudgetAlertToggle = useCallback(
    async (value: boolean) => {
      if (!value) {
        setBudgetAlertsEnabled(false);
        return;
      }
      // requestNotificationPermissions abre ajustes del sistema si fueron denegados
      const granted = await requestNotificationPermissions();
      if (!granted) return;
      setNotificationsEnabled(true);
      setBudgetAlertsEnabled(true);
    },
    [setBudgetAlertsEnabled, setNotificationsEnabled],
  );

  // Modals state
  const [periodSheet, setPeriodSheet] = useState(false);
  const [darkSheet, setDarkSheet] = useState(false);
  const [catBudgetEmoji, setCatBudgetEmoji] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCatBudgetModal, setShowCatBudgetModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showCommitmentsModal, setShowCommitmentsModal] = useState(false);
  const [editingCat, setEditingCat] = useState<UserCategory | null>(null);
  const [deleteCatDialog, setDeleteCatDialog] = useState<{ id: string; name: string } | null>(null);
  // Impide dejar un tipo (gasto/ingreso) sin ninguna categoría activa — mismo criterio
  // que "Debes tener al menos un método de pago activo" en Métodos de pago.
  const [minCatAlert, setMinCatAlert] = useState<"expense" | "income" | null>(null);

  function confirmDeleteCategory(cat: UserCategory) {
    const sameTypeCount = userCategories.filter((c) => c.type === cat.type).length;
    if (sameTypeCount <= 1) {
      setMinCatAlert(cat.type);
      return;
    }
    setDeleteCatDialog({ id: cat.id, name: cat.name });
  }

  const [clearDataDialog, setClearDataDialog] = useState(false);
  const [exportErrorDialog, setExportErrorDialog] = useState(false);
  const [notifPermDialog, setNotifPermDialog] = useState(false);

  // ── Lista activa: sus ajustes (categorías, presupuestos, período, ingresos…) ──
  const lists = useSettingsStore((s) => s.lists);
  const activeListId = useSettingsStore((s) => s.activeListId);
  const setShowIncome = useSettingsStore((s) => s.setShowIncome);
  const activeList = lists.find((l) => l.id === activeListId) ?? lists[0];
  // "Borrar historial" actúa sobre la lista activa; fuera de Personal se nombra.
  const activeListName = activeListId === DEFAULT_LIST_ID ? null : activeList.name;
  const showIncome = activeList.showIncome !== false;

  const listEditor = useListEditor();
  const [listsSheetOpen, setListsSheetOpen] = useState(false);
  const afterSheet = (fn: () => void) => {
    setListsSheetOpen(false);
    // Dos Modal apilados en Android se comportan mal: la siguiente hoja al cerrar esta.
    setTimeout(fn, 220);
  };

  const shareActiveList = useShareActiveList();
  const { exportCsv, importCsv } = useCsvTransfer();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  // ── Exportar / importar CSV (de la lista activa) ────────────────────────────
  async function handleExport() {
    if (!(await exportCsv())) setExportErrorDialog(true);
  }

  async function handleImport() {
    if (importing) return;
    setImporting(true);
    try {
      const result = await importCsv();
      if (result) setImportResult(result);
    } catch {
      setImportResult({ recognized: false, imported: 0, duplicates: 0, invalid: 0 });
    } finally {
      setImporting(false);
    }
  }

  // ── Limpiar datos ────────────────────────────────────────────────────────────
  function handleClearData() {
    setClearDataDialog(true);
  }

  async function executeClearData() {
    setClearDataDialog(false);
    const { clearTransactions } = await import("@/src/db/db");
    await clearTransactions();
    useFinanceStore.getState().loadTransactions();
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: tokens.colors.surface.primary }}
      edges={["top"]}
    >
      <StackedScreenHeader onBack={() => router.back()} title="Configuración" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: tokens.spacing.md,
          paddingBottom: insets.bottom + tokens.spacing.xl,
          gap: tokens.spacing.lg,
        }}
      >
        {/* ── CUENTA (opcional: sin sesión la app funciona igual) ──────── */}
        <Enter index={0} screenId="settings">
          <SectionHeader>CUENTA</SectionHeader>
          <AccountSection />
        </Enter>

        {/* ── LISTAS ───────────────────────────────────────────────────── */}
        <Enter index={1} screenId="settings">
          <SectionHeader>LISTAS</SectionHeader>
          <Card padded={false}>
            <ListRow
              label="Tus listas"
              icon={<Layers size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.accent.default}
              detail={String(lists.length)}
              showChevron
              onPress={() => setListsSheetOpen(true)}
            />
          </Card>
        </Enter>

        {/* ── EN TU LISTA ACTUAL: todo lo de aquí cambia con la lista activa ── */}
        <Enter index={2} screenId="settings">
          <SectionHeader>{`EN TU LISTA · ${activeList.emoji} ${activeList.name}`}</SectionHeader>
          <Card padded={false}>
            <ListRow
              label="Categorías"
              icon={<LayoutGrid size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.state.success}
              showChevron
              onPress={() => setShowCategoriesModal(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Presupuestos"
              icon={<PiggyBank size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#7C3AED"
              showChevron
              onPress={() => setShowCatBudgetModal(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Pago y período"
              icon={<Wallet size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.state.success}
              showChevron
              onPress={() => setPeriodSheet(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Mostrar ingresos"
              icon={<Eye size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#16A34A"
              onPress={() => setShowIncome(activeListId, !showIncome)}
              right={
                <Switch
                  value={showIncome}
                  onValueChange={(v) => setShowIncome(activeListId, v)}
                  trackColor={{ true: "#135BEC", false: tokens.colors.border.default }}
                  thumbColor={showIncome ? "#fff" : tokens.colors.text.secondary}
                />
              }
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Compartir lista"
              icon={<Share2 size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#0891B2"
              showChevron
              onPress={() => shareActiveList()}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Exportar CSV"
              icon={<Download size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.text.secondary}
              showChevron
              onPress={handleExport}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label={importing ? "Importando…" : "Importar CSV"}
              icon={<Upload size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.text.secondary}
              showChevron
              onPress={handleImport}
            />
          </Card>
        </Enter>

        {/* ── GESTIÓN (de todas las listas) ───────────────────────────── */}
        <Enter index={3} screenId="settings">
          <SectionHeader>GESTIÓN</SectionHeader>
          <Card padded={false}>
            <ListRow
              label="Métodos de pago"
              icon={<CreditCard size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.accent.default}
              showChevron
              onPress={() => setShowPaymentModal(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Compromisos"
              icon={<HandCoins size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={DEBT_COLOR}
              showChevron
              onPress={() => setShowCommitmentsModal(true)}
            />
          </Card>
        </Enter>

        {/* ── DETECCIÓN AUTOMÁTICA ──────────────────────────────────────── */}
        <Enter index={4} screenId="settings">
          <SectionHeader>DETECCIÓN AUTOMÁTICA</SectionHeader>
          <AutoDetectSection />
        </Enter>

        {/* ── SISTEMA ──────────────────────────────────────────────────── */}
        {/* Fusiona lo que antes eran 3 secciones separadas (Apariencia, Sistema,
            Acerca de) en una sola, a pedido del usuario (2026-09-02) — Modo oscuro
            y Versión no ameritaban su propia sección con una sola fila cada una. */}
        <Enter index={5} screenId="settings">
          <SectionHeader>SISTEMA</SectionHeader>
          <Card padded={false}>
            <ListRow
              label="Modo oscuro"
              icon={<Moon size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#7C3AED"
              showChevron
              onPress={() => setDarkSheet(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <BiometricLockRow />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Borrar historial de transacciones"
              icon={<Trash2 size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.state.danger}
              destructive
              onPress={handleClearData}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Versión"
              icon={<Info size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.text.secondary}
              detail={`v${APP_VERSION}`}
            />
          </Card>
        </Enter>
      </ScrollView>

      {/* ── Modales ───────────────────────────────────────────────────── */}

      <DefaultPeriodSheet visible={periodSheet} onClose={() => setPeriodSheet(false)} />

      <ListsSheet
        visible={listsSheetOpen}
        lists={lists}
        activeListId={activeListId}
        onSelect={(id) => {
          setListsSheetOpen(false);
          if (id !== activeListId) listEditor.goToList(id);
        }}
        onEditActive={() => afterSheet(() => listEditor.openEdit(activeListId))}
        onNew={() => afterSheet(listEditor.openNew)}
        onJoin={() => afterSheet(listEditor.openJoin)}
        onClose={() => setListsSheetOpen(false)}
      />
      {listEditor.element}

      <ConfirmDialog
        visible={importResult !== null}
        variant={importResult?.recognized && importResult.imported > 0 ? "info" : "warning"}
        title={importResult?.recognized ? "Importación lista" : "No se pudo importar"}
        message={
          !importResult
            ? ""
            : !importResult.recognized
              ? importResult.tooLarge
                ? "El archivo es demasiado grande para importarlo (máx. 8 MB)."
                : "El archivo no es un CSV exportado desde MyWallet. Usa Exportar CSV en la app para generarlo."
              : [
                  `Se importaron ${importResult.imported} movimientos en ${activeList.emoji} ${activeList.name}.`,
                  importResult.duplicates > 0
                    ? `${importResult.duplicates} ya estaban y se omitieron.`
                    : "",
                  importResult.invalid > 0
                    ? `${importResult.invalid} filas no se pudieron leer.`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
        }
        confirmLabel="Entendido"
        onConfirm={() => setImportResult(null)}
        onCancel={() => setImportResult(null)}
      />

      <SelectorModal
        visible={darkSheet}
        title="Modo de apariencia"
        options={[
          { key: "system", label: "Según el sistema" },
          { key: "light", label: "Claro" },
          { key: "dark", label: "Oscuro" },
        ]}
        selected={darkMode}
        onSelect={setDarkMode}
        onClose={() => setDarkSheet(false)}
      />

      {/* ── Hoja: Métodos de pago ─────────────────── */}
      <SettingsSheet
        visible={showPaymentModal}
        title="Métodos de pago"
        onClose={() => setShowPaymentModal(false)}
      >
        <PaymentMethodsSection />
      </SettingsSheet>

      {/* ── Hoja: Compromisos (deudas + metas de ahorro) ──────────── */}
      <SettingsSheet
        visible={showCommitmentsModal}
        title="Compromisos"
        subtitle="Lo que debes y lo que estás ahorrando"
        onClose={() => setShowCommitmentsModal(false)}
      >
        <CommitmentsSection />
      </SettingsSheet>

      {/* ── Bottom sheet: Categorías ─────────────────────────────────── */}
      <CategoriesSheet
        visible={showCategoriesModal}
        categories={userCategories}
        listLabel={`${activeList.emoji} ${activeList.name}`}
        onClose={() => setShowCategoriesModal(false)}
        onEdit={(cat) => {
          setShowCategoriesModal(false);
          setEditingCat(cat);
        }}
        onDelete={confirmDeleteCategory}
        onManage={() => {
          setShowCategoriesModal(false);
          router.push("/category-onboarding?edit=1");
        }}
      />

      {/* ── Modal editar categoría ─────────────────────────────────────── */}
      {editingCat && (
        <EditCategoryModal
          cat={editingCat}
          theme={theme}
          onSave={(updated) => {
            useSettingsStore.getState().updateUserCategory(updated.id, updated);
            setEditingCat(null);
            setShowCategoriesModal(true);
          }}
          onClose={() => {
            setEditingCat(null);
            setShowCategoriesModal(true);
          }}
        />
      )}

      {/* ── Hoja: Presupuesto por categoría ───────── */}
      <SettingsSheet
        visible={showCatBudgetModal}
        title="Presupuestos"
        subtitle={`${activeList.emoji} ${activeList.name} · Toca una para fijar su límite`}
        onClose={() => setShowCatBudgetModal(false)}
      >
        {/* Sección: Alertas de presupuesto */}
        <BudgetAlertSection
          enabled={budgetAlertsEnabled}
          threshold={budgetAlertThreshold}
          onToggle={handleBudgetAlertToggle}
        />
        {userCategories.filter((c) => c.type === "expense").length > 0 ? (
          <View>
            {userCategories
              .filter((c) => c.type === "expense")
              .map((cat) => {
                const current = budgetByCategory[cat.emoji];
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCatBudgetEmoji(cat.emoji)}
                    android_ripple={{ color: tokens.colors.border.default }}
                    style={[catSheet.row, { paddingHorizontal: 0 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.name}, ${current ? `Límite ${formatCOP(current)}` : "Sin límite"}`}
                  >
                    <View style={[catSheet.emojiCircle, { backgroundColor: cat.colorBg }]}>
                      <Text style={catSheet.emoji}>{cat.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[catSheet.name, { color: tokens.colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      <Text
                        style={[
                          catSheet.meta,
                          {
                            color: current
                              ? tokens.colors.state.success
                              : tokens.colors.text.secondary,
                          },
                        ]}
                      >
                        {current ? formatCOP(current) : "Sin límite"}
                      </Text>
                    </View>
                    {current ? (
                      <Pressable
                        onPress={() => removeBudgetForCategory(cat.emoji)}
                        hitSlop={10}
                        style={catSheet.deleteBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar límite de ${cat.name}`}
                      >
                        <X size={16} color={tokens.colors.text.secondary} strokeWidth={1.8} />
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })}
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ThemedText variant="subheadline" color="secondary">
              No tienes categorías de gasto configuradas
            </ThemedText>
          </View>
        )}
      </SettingsSheet>

      {/* Modal presupuesto por categoría (input) */}
      {catBudgetEmoji && (
        <InputModal
          visible
          title={`Límite para ${catBudgetEmoji} ${(() => {
            const cat = userCategories.find((c) => c.emoji === catBudgetEmoji);
            return cat?.name ?? catBudgetEmoji;
          })()}`}
          placeholder="Ej: 500000"
          value={budgetByCategory[catBudgetEmoji] ? String(budgetByCategory[catBudgetEmoji]) : ""}
          keyboardType="numeric"
          onConfirm={(v) => {
            const amount = parseFloat(v.replace(/\D/g, "")) || 0;
            if (amount > 0) {
              setBudgetForCategory(catBudgetEmoji, amount);
              // Si las notificaciones no están habilitadas, sugerir activarlas
              if (!notificationsEnabled) setNotifPermDialog(true);
            } else {
              removeBudgetForCategory(catBudgetEmoji);
            }
          }}
          onClose={() => setCatBudgetEmoji(null)}
        />
      )}

      <ConfirmDialog
        visible={notifPermDialog}
        variant="info"
        title="Alertas de presupuesto"
        message="¿Quieres recibir una notificación cuando superes el límite de una categoría? Puedes desactivarlo después."
        confirmLabel="Activar alertas"
        cancelLabel="Ahora no"
        onConfirm={async () => {
          setNotifPermDialog(false);
          await requestNotificationPermissions();
        }}
        onCancel={() => setNotifPermDialog(false)}
      />

      <ConfirmDialog
        visible={clearDataDialog}
        variant="danger"
        title="Borrar historial"
        message={
          activeListName
            ? `Se eliminarán todos los registros de la lista "${activeListName}". Tus otras listas, configuración, categorías, presupuestos y metas se conservarán. Esta acción no se puede deshacer.`
            : "Se eliminarán todos tus registros de ingresos y gastos, de todas tus listas. Tu configuración, categorías, presupuestos y metas se conservarán. Esta acción no se puede deshacer."
        }
        confirmLabel="Borrar historial"
        onConfirm={executeClearData}
        onCancel={() => setClearDataDialog(false)}
      />

      <ConfirmDialog
        visible={exportErrorDialog}
        variant="warning"
        title="Error al exportar"
        message="No se pudo generar o compartir el archivo CSV. Intenta de nuevo."
        confirmLabel="Entendido"
        onConfirm={() => setExportErrorDialog(false)}
        onCancel={() => setExportErrorDialog(false)}
      />

      <ConfirmDialog
        visible={!!deleteCatDialog}
        variant="danger"
        title="Eliminar categoría"
        message={`¿Seguro que quieres eliminar "${deleteCatDialog?.name ?? ""}"? Las transacciones ya registradas con esta categoría no se modifican.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteCatDialog) useSettingsStore.getState().removeUserCategory(deleteCatDialog.id);
          setDeleteCatDialog(null);
        }}
        onCancel={() => setDeleteCatDialog(null)}
      />

      <ConfirmDialog
        visible={!!minCatAlert}
        variant="info"
        title="No es posible"
        message={`Debes tener al menos una categoría de ${minCatAlert === "income" ? "ingreso" : "gasto"} activa.`}
        confirmLabel="Entendido"
        onConfirm={() => setMinCatAlert(null)}
        onCancel={() => setMinCatAlert(null)}
      />
    </SafeAreaView>
  );
}
