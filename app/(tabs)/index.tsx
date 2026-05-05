import { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import Reanimated from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings, Search, X, Hash } from "lucide-react-native";
import { router } from "expo-router";
import { scrollBottomPadding, DOCK_HEIGHT, DOCK_BOTTOM_OFFSET } from "@/src/constants/layout";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import type { TransactionRow } from "@/src/db/db";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useExpenseStore } from "@/src/store/useExpenseStore";
import { useToastStore } from "@/src/store/useToastStore";
import { FilterChips } from "@/src/components/ui/FilterChips";
import { CategoryChart } from "@/src/components/ui/CategoryChart";
import { TransactionItem } from "@/src/components/ui/TransactionItem";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { MonthPickerModal } from "@/src/components/ui/MonthPickerModal";
import { GuidedTour } from "@/src/components/ui/GuidedTour";
import { RollingNumber } from "@/src/components/ui/RollingNumber";
import { getTourRef, TOUR_KEYS } from "@/src/utils/tourRefs";
import { formatBalance } from "@/src/utils/transactionFormatters";
import { useTransactionFilters } from "@/src/hooks/useTransactionFilters";
import { useDashboardSearch } from "@/src/hooks/useDashboardSearch";
import { useDashboardTotals } from "@/src/hooks/useDashboardTotals";
import { useDashboardScroll } from "@/src/hooks/useDashboardScroll";
import { useDashboardTour } from "@/src/hooks/useDashboardTour";
import { NotificationBadgeBtn } from "@/src/components/dashboard/NotificationBadgeBtn";
import { TransactionDetailModal } from "@/src/components/dashboard/TransactionDetailModal";

// ─── Tipo local ───────────────────────────────────────────────────────────────

type TxRow = ReturnType<typeof useFinanceStore.getState>["transactions"][0];

// Re-exportar PeriodFilter para que importadores externos no se rompan
export type { PeriodFilter } from "@/src/utils/periodFilter";

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const theme             = useTheme();
  const insets            = useSafeAreaInsets();
  const transactions      = useFinanceStore((s) => s.transactions);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const addTransaction    = useFinanceStore((s) => s.addTransaction);
  const monthlyBudget     = useSettingsStore((s) => s.monthlyBudget);
  const userCategories    = useSettingsStore((s) => s.userCategories);
  const resetExpense      = useExpenseStore((s) => s.reset);
  const setExpenseCategory = useExpenseStore((s) => s.setCategory);
  const paymentMethods    = useSettingsStore((s) => s.paymentMethods);
  const savingsGoals      = useSettingsStore((s) => s.savingsGoals);
  const addToast          = useToastStore((s) => s.addToast);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // ── Detalle de transacción (long-press) ──────────────────────────────────
  const [detailTx, setDetailTx] = useState<TransactionRow | null>(null);

  // ── Filtros de período y tipo ────────────────────────────────────────────
  const {
    periodFilter,
    setPeriodFilter,
    typeFilter,
    handlePillPress,
    monthPickerOpen,
    setMonthPickerOpen,
    filteredTransactions,
    typeFilteredTransactions,
    chipLabel,
    quickLabel,
    isCurrentPeriod,
  } = useTransactionFilters(transactions);

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  const baseSearchBottom = Math.max(insets.bottom, 0) + DOCK_BOTTOM_OFFSET + DOCK_HEIGHT + 10;
  const {
    searchInputRef,
    tagDropdownOpen,
    searchBarAnim,
    keyboardExtraAnim,
    searchBarOpacity,
    tagSuggestions,
    isTypingTag,
    handleSelectTag,
    handleSearchTextChange,
    handleSearchSubmit,
    searchedTransactions,
    displayedTransactions,
    isSearching,
    searchOpen,
    searchQuery,
    activeTags,
    removeTag,
    closeSearch,
  } = useDashboardSearch({ transactions, typeFilteredTransactions, baseSearchBottom });

  // ── Totales y estadísticas ───────────────────────────────────────────────
  const {
    expenseTotal,
    incomeTotal,
    netBalance,
    budgetPct,
    activeStats,
    activeTotalForChart,
    activeBudget,
    allEmojis,
  } = useDashboardTotals({
    transactions,
    filteredTransactions,
    typeFilteredTransactions,
    searchedTransactions,
    isSearching,
    typeFilter,
    isCurrentPeriod,
  });

  // ── Scroll y animaciones ─────────────────────────────────────────────────
  const {
    scrollY,
    scrollHandler,
    headerParallaxStyle,
    pillsParallaxStyle,
    chartAnimKey,
  } = useDashboardScroll(typeFilter, periodFilter);

  // ── Tour de onboarding ───────────────────────────────────────────────────
  const {
    dashboardTourSteps,
    dashboardTourVisible,
    dashboardTourIndex,
    onboardingStep,
    completeOnboarding,
  } = useDashboardTour();

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleNewTransactionFromChart(emoji: string, categoryName: string) {
    resetExpense();
    setExpenseCategory(emoji, categoryName);
    router.push("/active-expense");
  }

  const keyExtractor = useCallback((item: TxRow) => item.id.toString(), []);

  const handleDetail = useCallback((tx: TransactionRow) => setDetailTx(tx), []);

  const handleDeleteTransaction = useCallback(async (id: number) => {
    const tx = transactions.find((t) => t.id === id);
    await deleteTransaction(id);
    if (!tx) return;

    const tags = (() => { try { return JSON.parse(tx.tags || "[]"); } catch { return []; } })();
    addToast({
      level: "info",
      icon: tx.category_emoji,
      title: "Transacción eliminada",
      actionLabel: "Deshacer",
      duration: 6000,
      onAction: () =>
        addTransaction(tx.amount, tx.description, tx.category_emoji, tags, new Date(tx.date), tx.payment_method ?? "cash"),
    });
  }, [transactions, deleteTransaction, addTransaction, addToast]);

  const renderItem = useCallback(({ item, index }: { item: TxRow; index: number }) => (
    <View style={styles.txItem}>
      <TransactionItem
        transaction={item}
        index={index}
        dimmed={false}
        onDelete={handleDeleteTransaction}
        onDetail={handleDetail}
      />
    </View>
  ), [handleDeleteTransaction, handleDetail, styles.txItem]);

  // ── Derivados de estado ───────────────────────────────────────────────────
  const isNewPeriod      = filteredTransactions.length === 0 && isCurrentPeriod && !isSearching;
  const newPeriodMessage = "Nuevo mes, ¡comienza ahora!";

  // ── ListHeader ────────────────────────────────────────────────────────────
  const listHeader = (
    <>
      {!isSearching && (
        <View style={styles.chartWrapper}>
          {isNewPeriod && (
            <View style={styles.newPeriodOverlay}>
              <Text style={styles.newPeriodText}>{newPeriodMessage}</Text>
              <Text style={styles.newPeriodSub}>Registra tu primer movimiento con + o el micrófono</Text>
            </View>
          )}
          <View style={[isNewPeriod ? { opacity: 0.18 } : undefined, { paddingBottom: 16 }]}>
            <CategoryChart
              stats={activeStats}
              allEmojis={allEmojis}
              totalExpenses={activeTotalForChart}
              budgetByCategory={activeBudget}
              onNewTransaction={handleNewTransactionFromChart}
              alertColors={typeFilter !== "income"}
              isIncomeMode={typeFilter === "income"}
              animationKey={chartAnimKey}
              scrollY={scrollY}
            />
          </View>
        </View>
      )}

      {displayedTransactions.length > 0 && (
        <View style={styles.dayHeader}>
          <Text style={styles.dayLabel}>
            {isSearching       ? "RESULTADOS"
              : typeFilter === "expense" ? "GASTOS"
              : typeFilter === "income"  ? "INGRESOS"
              : "RECIENTE"}
          </Text>
          <Text style={styles.dayLabelRight}>
            {isSearching
              ? `${searchedTransactions.length} encontrados`
              : chipLabel.toUpperCase()}
          </Text>
        </View>
      )}
    </>
  );

  // ── ListEmpty ─────────────────────────────────────────────────────────────
  const listEmpty = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{isSearching ? "🔍" : isNewPeriod ? "" : "💸"}</Text>
      <Text style={styles.emptyTitle}>
        {isSearching
          ? "Sin resultados"
          : isNewPeriod
            ? ""
            : !isCurrentPeriod
              ? "Sin registros en este período"
              : "Sin movimientos aún"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isSearching
          ? activeTags.length > 0
            ? `No hay transacciones con ${activeTags.map((t) => "#" + t).join(", ")}${searchQuery.trim() ? ` y "${searchQuery.trim()}"` : ""}`
            : `No se encontró nada para "${searchQuery}"`
          : isNewPeriod
            ? ""
            : !isCurrentPeriod
              ? "Usa el filtro de período para navegar a otro mes"
              : "Toca + o el micrófono para registrar tu primer gasto o ingreso."}
      </Text>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {/* ══════════════════════════════════════════════════════════════
          HEADER FIJO — siempre visible
          ══════════════════════════════════════════════════════════════ */}
      <View style={styles.headerOuter}>
        <View style={styles.headerLeft}>
          <Reanimated.View style={[styles.balanceSection, headerParallaxStyle as object]}>
            <Text style={styles.balanceLabel}>
              {isSearching
                ? `BÚSQUEDA  ·  ${searchedTransactions.length} resultado${searchedTransactions.length !== 1 ? "s" : ""}`
                : "BALANCE NETO"}
            </Text>
            <RollingNumber
              value={Math.abs(netBalance)}
              prefix="$"
              style={[styles.balanceAmount, netBalance < 0 && styles.balanceNegative]}
            />
            <Reanimated.View style={[styles.pillsRow, pillsParallaxStyle as object]}>
              <TouchableOpacity
                onPress={() => handlePillPress("expense")}
                activeOpacity={0.75}
                style={[
                  styles.pillGasto,
                  typeFilter === "expense" && styles.pillGastoActive,
                  typeFilter === "income"  && styles.pillDimmed,
                ]}
              >
                <View style={styles.pillContent}>
                  <Text style={[styles.pillGastoText, typeFilter === "expense" && styles.pillGastoActiveText]}>
                    {"↓ "}
                  </Text>
                  <RollingNumber
                    value={expenseTotal}
                    prefix="$"
                    style={[styles.pillGastoText, typeFilter === "expense" && styles.pillGastoActiveText]}
                  />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handlePillPress("income")}
                activeOpacity={0.75}
                style={[
                  styles.pillIngreso,
                  typeFilter === "income"  && styles.pillIngresoActive,
                  typeFilter === "expense" && styles.pillDimmed,
                ]}
              >
                <View style={styles.pillContent}>
                  <Text style={[styles.pillIngresoText, typeFilter === "income" && styles.pillIngresoActiveText]}>
                    {"↑ "}
                  </Text>
                  <RollingNumber
                    value={incomeTotal}
                    prefix="$"
                    style={[styles.pillIngresoText, typeFilter === "income" && styles.pillIngresoActiveText]}
                  />
                </View>
              </TouchableOpacity>
            </Reanimated.View>
            {monthlyBudget > 0 && !isSearching && typeFilter === null && isCurrentPeriod && (
              <View style={styles.budgetBar}>
                <View style={styles.budgetTrack}>
                  <View style={[styles.budgetFill, { width: `${budgetPct}%` as `${number}%` }]} />
                </View>
                <Text style={styles.budgetBarPct}>{budgetPct}% de {formatBalance(monthlyBudget)}</Text>
              </View>
            )}
          </Reanimated.View>
          <FilterChips
            period={quickLabel}
            periodLabel={chipLabel !== quickLabel ? chipLabel : undefined}
            onPeriodChange={(label) => setPeriodFilter({ type: "quick", label })}
            onOpenMonthPicker={() => setMonthPickerOpen(true)}
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <NotificationBadgeBtn />
          <View ref={getTourRef(TOUR_KEYS.SETTINGS_BTN)} collapsable={false}>
            <Pressable style={styles.settingsBtn} onPress={() => router.push("/settings")}>
              <Settings size={22} color={theme.text} strokeWidth={1.6} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════
          LISTA — gráfica + transacciones en un solo scroll unificado
          ══════════════════════════════════════════════════════════════ */}
      <Reanimated.FlatList
        data={displayedTransactions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onScroll={scrollHandler}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: scrollBottomPadding(insets.bottom) },
        ]}
        style={styles.list}
      />

      {/* ══════════════════════════════════════════════════════════════
          BARRA DE BÚSQUEDA — flotante encima del dock
          ══════════════════════════════════════════════════════════════ */}
      <Animated.View
        style={[
          styles.searchWrapper,
          {
            bottom: Animated.add(baseSearchBottom, keyboardExtraAnim),
            opacity: searchBarOpacity,
            transform: [{ translateY: searchBarAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
        pointerEvents={searchOpen ? "auto" : "none"}
      >
        {/* Dropdown de sugerencias — encima de la barra */}
        {tagDropdownOpen && (
          <Animated.View style={styles.tagDropdown}>
            {tagSuggestions.map((tag) => (
              <TouchableOpacity
                key={tag}
                activeOpacity={0.6}
                onPress={() => handleSelectTag(tag)}
                style={styles.tagSuggestionRow}
              >
                <Hash size={13} color={theme.textSub} strokeWidth={2.2} />
                <Text style={styles.tagSuggestionText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Barra principal */}
        <View style={styles.searchBarOverlay}>
          <Search size={16} color="#9CA3AF" strokeWidth={2} style={{ marginLeft: 2 }} />

          {/* Chips de tags activos */}
          {activeTags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {activeTags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{tag}</Text>
                  <TouchableOpacity
                    onPress={() => removeTag(tag)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                  >
                    <X size={12} color={theme.textSub} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, activeTags.length > 0 && { flex: 1, minWidth: 60 }]}
            placeholder={activeTags.length > 0 ? "Buscar..." : "Nombre, categoría o #tag..."}
            placeholderTextColor="#C4C4C6"
            value={searchQuery}
            onChangeText={handleSearchTextChange}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity style={styles.searchCancelBtn} onPress={closeSearch}>
            <X size={14} color="#555" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Selector de mes/año */}
      <MonthPickerModal
        visible={monthPickerOpen}
        selectedYear={
          periodFilter.type === "month" ? periodFilter.year :
          periodFilter.type === "year"  ? periodFilter.year : null
        }
        selectedMonth={periodFilter.type === "month" ? periodFilter.month : null}
        onApply={(year, month) => {
          if (year === null)       setPeriodFilter({ type: "all" });
          else if (month === null) setPeriodFilter({ type: "year", year });
          else                     setPeriodFilter({ type: "month", year, month });
          setMonthPickerOpen(false);
        }}
        onClose={() => setMonthPickerOpen(false)}
      />

      {/* Modal de detalle de transacción */}
      <TransactionDetailModal
        visible={detailTx !== null}
        onClose={() => setDetailTx(null)}
        transaction={detailTx}
        userCategories={userCategories}
        savingsGoals={savingsGoals}
        paymentMethods={paymentMethods}
      />

      {/* Guided Tour — usa Modal interno, siempre encima de todo */}
      <GuidedTour
        steps={dashboardTourSteps}
        currentStep={dashboardTourIndex}
        globalStep={onboardingStep}
        totalSteps={5}
        visible={dashboardTourVisible}
        onSkip={completeOnboarding}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.bg,
    },

    // ── Header fijo ──────────────────────────────────────────────────────────
    headerOuter: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: 28,
      paddingTop: 12,
      paddingBottom: 16,
    },
    headerLeft: {
      flexDirection: "column",
      gap: 14,
      flex: 1,
    },
    settingsBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Balance ─────────────────────────────────────────────────────────────
    balanceSection: {
      gap: 6,
    },
    balanceLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: t.textTertiary,
      letterSpacing: 2.0,
      textTransform: "uppercase",
    },
    balanceAmount: {
      fontSize: 38,
      fontWeight: "800",
      color: t.text,
      letterSpacing: -1.5,
      lineHeight: 44,
    },
    balanceNegative: {
      color: "#DC2626",
    },

    // ── Pills ───────────────────────────────────────────────────────────────
    pillsRow: {
      flexDirection: "row",
      gap: 8,
    },
    pillGasto: {
      backgroundColor: t.pillNeutral,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    pillGastoActive:     { backgroundColor: "#FFE4E6" },
    pillGastoText: {
      fontSize: 13,
      fontWeight: "600",
      color: t.text,
      letterSpacing: 0.1,
    },
    pillGastoActiveText: { color: "#DC2626", fontWeight: "700" },
    pillIngreso: {
      backgroundColor: t.pillNeutral,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    pillIngresoActive:     { backgroundColor: "#DCFCE7" },
    pillIngresoText: {
      fontSize: 13,
      fontWeight: "600",
      color: t.text,
      letterSpacing: 0.1,
    },
    pillIngresoActiveText: { color: "#16A34A", fontWeight: "700" },
    pillDimmed:            { opacity: 0.4 },
    pillContent: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },

    // ── Presupuesto ─────────────────────────────────────────────────────────
    budgetBar: {
      gap: 5,
      width: "100%",
      marginTop: 6,
    },
    budgetBarPct: {
      fontSize: 11,
      fontWeight: "500",
      color: t.textSub,
      letterSpacing: 0.1,
    },
    budgetTrack: {
      height: 3,
      backgroundColor: t.border,
      borderRadius: 9999,
      overflow: "hidden",
    },
    budgetFill: {
      height: 3,
      borderRadius: 9999,
      backgroundColor: "#2D5BFF",
    },

    // ── Lista ───────────────────────────────────────────────────────────────
    list: {
      flex: 1,
    },
    listContent: {
      paddingTop: 0,
    },
    chartWrapper: {
      overflow: "hidden", // necesario para el colapso animado en Android
    },
    newPeriodOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    newPeriodText: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: t.textSub,
      textAlign: "center" as const,
    },
    newPeriodSub: {
      fontSize: 13,
      fontWeight: "400" as const,
      color: t.textTertiary ?? t.textSub,
      textAlign: "center" as const,
      marginTop: 6,
    },
    txItem: {
      paddingHorizontal: 28,
    },

    // ── Cabecera de sección ─────────────────────────────────────────────────
    dayHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      paddingHorizontal: 28,
      paddingTop: 4,
    },
    dayLabel: {
      fontSize: 12,
      fontWeight: "900",
      color: t.text,
      letterSpacing: 2.4,
      lineHeight: 18,
    },
    dayLabelRight: {
      fontSize: 12,
      fontWeight: "900",
      color: t.text,
      letterSpacing: 1,
    },

    // ── Estado vacío ────────────────────────────────────────────────────────
    emptyState: {
      alignItems: "center",
      paddingVertical: 64,
      paddingHorizontal: 28,
    },
    emptyEmoji:    { fontSize: 48, marginBottom: 14 },
    emptyTitle:    { fontSize: 17, fontWeight: "700", color: t.textSub, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: t.textTertiary, textAlign: "center", lineHeight: 21 },

    // ── Barra de búsqueda ───────────────────────────────────────────────────
    searchWrapper: {
      position: "absolute",
      left: 20,
      right: 20,
      zIndex: 90,
    },
    searchBarOverlay: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: t.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
      elevation: 10,
    },
    chipsScroll: {
      flexGrow: 0,
      flexShrink: 1,
      maxWidth: "55%" as `${number}%`,
    },
    chipsContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    tagChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: t.isDark ? "#1E3A5F" : "#EFF6FF",
      borderRadius: 999,
      paddingVertical: 5,
      paddingLeft: 10,
      paddingRight: 6,
    },
    tagChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: t.isDark ? "#93C5FD" : "#1D4ED8",
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: t.text,
      paddingVertical: 0,
    },
    searchCancelBtn: {
      width: 28,
      height: 28,
      borderRadius: 999,
      backgroundColor: t.inputBg,
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Dropdown de sugerencias de tags ─────────────────────────────────────
    tagDropdown: {
      backgroundColor: t.surface,
      borderRadius: 16,
      marginBottom: 8,
      paddingVertical: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
    tagSuggestionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    tagSuggestionText: {
      fontSize: 14,
      fontWeight: "500",
      color: t.text,
    },
  });
}
