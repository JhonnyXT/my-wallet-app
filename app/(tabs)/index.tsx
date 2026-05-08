import { useMemo, useState, useCallback, useEffect, useRef } from "react";
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
  BackHandler,
  PanResponder,
} from "react-native";
import Reanimated, { useAnimatedReaction, runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings, Search, X, Hash, ArrowDown, ArrowUp } from "lucide-react-native";
import { router } from "expo-router";
import { scrollBottomPadding, DOCK_HEIGHT, DOCK_BOTTOM_OFFSET } from "@/src/constants/layout";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import type { TransactionRow } from "@/src/db/db";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useExpenseStore } from "@/src/store/useExpenseStore";
import { useUIStore } from "@/src/store/useUIStore";

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
    categoryFilter,
    clearCategoryFilter,
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

  // ── Filtro por categoría (tap corto en columna del chart) ───────────────
  const setCategoryFilter = useUIStore((s) => s.setCategoryFilter);

  const handleCategoryTap = useCallback((emoji: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategoryFilter({ emoji, name });
  }, [setCategoryFilter]);

  // Botón atrás del dispositivo: cierra primero el filtro de categoría
  useEffect(() => {
    if (!categoryFilter) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      clearCategoryFilter();
      return true;
    });
    return () => sub.remove();
  }, [categoryFilter, clearCategoryFilter]);

  // ── Pull-down sin spinner para limpiar el filtro de categoría ───────────
  // Refleja en JS si el FlatList está en el tope (solo cambia al cruzar el umbral,
  // sin disparar runOnJS en cada frame).
  const atTopRef = useRef(true);
  const setAtTop = useCallback((v: boolean) => { atTopRef.current = v; }, []);
  useAnimatedReaction(
    () => scrollY.value <= 4,
    (atTop, prev) => {
      "worklet";
      if (atTop !== prev) runOnJS(setAtTop)(atTop);
    },
    [scrollY],
  );

  // PanResponder en capa de captura: solo intercepta cuando hay filtro activo,
  // estamos en el tope del scroll y el gesto es claramente vertical descendente.
  // Si suelta tras arrastrar > 80 px, limpia el filtro. No muestra ningún spinner.
  const pullDownPan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponderCapture: (_, gs) =>
      !!categoryFilter
      && atTopRef.current
      && gs.dy > 14
      && gs.dy > Math.abs(gs.dx) * 1.2,
    onPanResponderGrant: () => {
      Haptics.selectionAsync();
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 80) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        clearCategoryFilter();
      }
    },
  }), [categoryFilter, clearCategoryFilter]);

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
  }, [transactions, deleteTransaction]);

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
      {/* Chip de filtro de categoría activo (informativo, sin botón de cierre) */}
      {categoryFilter && (
        <View style={styles.catFilterRow}>
          <View style={styles.catFilterChip}>
            <Text style={styles.catFilterEmoji}>{categoryFilter.emoji}</Text>
            <Text style={styles.catFilterText}>{categoryFilter.name}</Text>
          </View>
        </View>
      )}

      {/* Chart: oculto durante búsqueda o filtro de categoría */}
      {!isSearching && !categoryFilter && (
        <View style={styles.chartWrapper}>
          {isNewPeriod && (
            <View style={styles.newPeriodOverlay}>
              <Text style={styles.newPeriodText}>{newPeriodMessage}</Text>
              <Text style={styles.newPeriodSub}>Registra tu primer movimiento con + o el micrófono</Text>
            </View>
          )}
          <View style={[isNewPeriod ? { opacity: 0.18 } : undefined, { paddingTop: 8, paddingBottom: 16 }]}>
            <CategoryChart
              stats={activeStats}
              allEmojis={allEmojis}
              totalExpenses={activeTotalForChart}
              budgetByCategory={activeBudget}
              onNewTransaction={handleNewTransactionFromChart}
              onCategoryTap={handleCategoryTap}
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
              : categoryFilter  ? categoryFilter.name.toUpperCase()
              : typeFilter === "expense" ? "GASTOS"
              : typeFilter === "income"  ? "INGRESOS"
              : "RECIENTE"}
          </Text>
          <Text style={styles.dayLabelRight}>
            {isSearching
              ? `${searchedTransactions.length} encontrados`
              : categoryFilter
                ? `${displayedTransactions.length} ${displayedTransactions.length === 1 ? "registro" : "registros"}`
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
        {/* Íconos: posición absoluta para no afectar el centrado del contenido */}
        <View style={styles.headerActions}>
          <NotificationBadgeBtn />
          <View ref={getTourRef(TOUR_KEYS.SETTINGS_BTN)} collapsable={false}>
            <Pressable style={styles.settingsBtn} onPress={() => router.push("/settings")}>
              <Settings size={22} color={theme.text} strokeWidth={1.6} />
            </Pressable>
          </View>
        </View>

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

            {/* ── Banner: categoría excedida — eliminado; se usa notificación push ── */}

            <Reanimated.View style={[styles.pillsRow, pillsParallaxStyle as object]}>
              {/* Gasto activo cuando typeFilter !== "income" */}
              <TouchableOpacity
                onPress={() => handlePillPress("expense")}
                activeOpacity={0.75}
                style={[
                  styles.pill,
                  typeFilter !== "income" ? styles.pillExpenseActive : styles.pillInactive,
                ]}
              >
                <ArrowDown
                  size={13}
                  strokeWidth={2.8}
                  color={typeFilter !== "income" ? "#E53E3E" : "#9CA3AF"}
                />
                <RollingNumber
                  value={expenseTotal}
                  prefix="$"
                  style={[
                    styles.pillText,
                    typeFilter !== "income" ? styles.pillExpenseText : styles.pillInactiveText,
                  ]}
                />
              </TouchableOpacity>

              {/* Ingreso activo solo cuando typeFilter === "income" */}
              <TouchableOpacity
                onPress={() => handlePillPress("income")}
                activeOpacity={0.75}
                style={[
                  styles.pill,
                  typeFilter === "income" ? styles.pillIncomeActive : styles.pillInactive,
                ]}
              >
                <ArrowUp
                  size={13}
                  strokeWidth={2.8}
                  color={typeFilter === "income" ? "#16A34A" : "#9CA3AF"}
                />
                <RollingNumber
                  value={incomeTotal}
                  prefix="$"
                  style={[
                    styles.pillText,
                    typeFilter === "income" ? styles.pillIncomeText : styles.pillInactiveText,
                  ]}
                />
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
      </View>

      {/* ══════════════════════════════════════════════════════════════
          LISTA — gráfica + transacciones en un solo scroll unificado
          ══════════════════════════════════════════════════════════════ */}
      <View style={styles.list} {...pullDownPan.panHandlers}>
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
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: scrollBottomPadding(insets.bottom) },
          ]}
          style={styles.list}
        />
      </View>

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
      position: "relative",
      paddingHorizontal: 28,
      paddingTop: 64,
      paddingBottom: 20,
    },
    // Íconos flotantes — absolutos para no romper el centrado del contenido
    headerActions: {
      position: "absolute",
      top: 14,
      right: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      zIndex: 10,
    },
    headerLeft: {
      flexDirection: "column",
      gap: 10,
      alignItems: "center",
    },
    settingsBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Balance ─────────────────────────────────────────────────────────────
    balanceSection: {
      gap: 8,
      alignItems: "center",
    },
    balanceLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: t.textTertiary,
      letterSpacing: 2.0,
      textTransform: "uppercase",
      textAlign: "center",
    },
    balanceAmount: {
      fontSize: 56,
      fontWeight: "800",
      color: t.text,
      letterSpacing: -2.5,
      lineHeight: 64,
      textAlign: "center",
    },
    balanceNegative: {
      color: "#DC2626",
    },

    // ── Pills ───────────────────────────────────────────────────────────────
    pillsRow: {
      flexDirection: "row",
      gap: 8,
    },
    // Base compartida
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 14,
    },
    pillText: {
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.1,
    },
    // Activo — gasto
    pillExpenseActive: { backgroundColor: "#FEE2E2" },  // rojo claro (no rosa)
    pillExpenseText:   { color: "#E53E3E" },             // rojo medio, no demasiado intenso
    // Activo — ingreso
    pillIncomeActive:  { backgroundColor: "#DCFCE7" },  // verde claro
    pillIncomeText:    { color: "#16A34A" },             // verde medio
    // Inactivo — gris neutro
    pillInactive:     { backgroundColor: t.pillNeutral ?? "#F1F5F9" },
    pillInactiveText: { color: "#9CA3AF", fontWeight: "600" as const },
    pillContent: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },

    // ── Presupuesto mensual ──────────────────────────────────────────────────
    budgetBar: {
      gap: 5,
      alignSelf: "stretch",
      marginTop: 4,
    },
    budgetBarPct: {
      fontSize: 11,
      fontWeight: "500",
      color: t.textSub,
      letterSpacing: 0.1,
      textAlign: "center",
    },
    budgetTrack: {
      height: 4,
      backgroundColor: t.border,
      borderRadius: 9999,
      overflow: "hidden",
    },
    budgetFill: {
      height: 4,
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

    // ── Chip de filtro de categoría activa ──────────────────────────────────
    catFilterRow: {
      flexDirection: "row",
      paddingHorizontal: 28,
      paddingTop: 8,
      paddingBottom: 4,
    },
    catFilterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: t.surface,
      borderRadius: 9999,
      paddingLeft: 12,
      paddingRight: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: t.border,
    },
    catFilterEmoji: {
      fontSize: 14,
      lineHeight: 18,
    },
    catFilterText: {
      fontSize: 13,
      fontWeight: "700",
      color: t.text,
      letterSpacing: 0.1,
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
