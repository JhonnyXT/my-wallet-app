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
import Reanimated, {
  useAnimatedReaction,
  useAnimatedRef,
  runOnJS,
  runOnUI,
  scrollTo,
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Settings,
  Search,
  X,
  Hash,
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react-native";
import { router } from "expo-router";
import { scrollBottomPadding, DOCK_HEIGHT, DOCK_BOTTOM_OFFSET } from "@/src/constants/layout";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { SELF_PAYER, type TransactionRow } from "@/src/db/db";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { syncNow, useSession, useSyncStatus } from "@/src/sync";
import { useExpenseStore } from "@/src/store/useExpenseStore";
import { useUIStore } from "@/src/store/useUIStore";
import { useAllListCategories } from "@/src/hooks/useAllListCategories";
import { useListEditor } from "@/src/hooks/useListEditor";
import { useActiveListSettlement, useShareActiveList } from "@/src/hooks/useActiveListShare";

import { CategoryChart } from "@/src/components/ui/CategoryChart";
import { TransactionItem } from "@/src/components/ui/TransactionItem";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { moneyColors } from "@/src/theme/tokens";
import { PeriodStrip } from "@/src/components/ui/PeriodStrip";
import { PeriodMenu, type MenuAnchor, type PeriodMenuAction } from "@/src/components/ui/PeriodMenu";
import { DateRangeSheet } from "@/src/components/ui/DateRangeSheet";
import { DefaultPeriodSheet } from "@/src/components/ui/DefaultPeriodSheet";
import { ListMenu } from "@/src/components/ui/ListMenu";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { DEFAULT_LIST_ID } from "@/src/constants/lists";
import { parseYMD, toYMD } from "@/src/utils/periodCycles";
import { GuidedTour } from "@/src/components/ui/GuidedTour";
import { RollingNumber } from "@/src/components/ui/RollingNumber";
import { getTourRef, TOUR_KEYS } from "@/src/utils/tourRefs";
import { settlementHeadline } from "@/src/utils/settlement";
import { SettlementSheet } from "@/src/components/ui/SettlementSheet";
import {
  formatBalance,
  groupTransactionsByDay,
  type DayGroupRow,
} from "@/src/utils/transactionFormatters";
import { useTransactionFilters } from "@/src/hooks/useTransactionFilters";
import { useDashboardSearch } from "@/src/hooks/useDashboardSearch";
import { useDashboardTotals } from "@/src/hooks/useDashboardTotals";
import { useDashboardScroll } from "@/src/hooks/useDashboardScroll";
import { useDashboardTour } from "@/src/hooks/useDashboardTour";
import { NotificationBadgeBtn } from "@/src/components/dashboard/NotificationBadgeBtn";
import {
  SyncPullIndicator,
  type SyncPullPhase,
} from "@/src/components/dashboard/SyncPullIndicator";
import { TransactionDetailModal } from "@/src/components/dashboard/TransactionDetailModal";

// ─── Tipo local ───────────────────────────────────────────────────────────────

type TxRow = ReturnType<typeof useFinanceStore.getState>["transactions"][0];
type ListRowItem = DayGroupRow<TxRow>;

/** Arrastre (px) desde el tope de la lista que quita el filtro de categoría al soltar. */
const PULL_CLEAR_DISTANCE = 90;
// Deslizar el balance para traer cambios: el contenido baja con resistencia de goma (cada px
// cuesta más que el anterior, con tope PULL_MAX_OFFSET); soltar pasado PULL_HOLD_OFFSET trae.
const PULL_MAX_OFFSET = 150;
const PULL_HOLD_OFFSET = 64;
const PULL_RUBBER = 0.75;
// Una sync rápida (sin cambios) igual se ve: el indicador gira al menos este tiempo, y el ✓
// queda un instante antes de que el contenido suba.
const PULL_MIN_REFRESH_MS = 700;
const PULL_DONE_MS = 450;
// Sin conexión la sync espera hasta su propio tope (30 s): la animación no. Pasado esto muestra
// "sin conexión" y la sync sigue en segundo plano (reintenta sola al volver la red).
const PULL_MAX_WAIT_MS = 8000;
// El aviso de "sin conexión" queda un poco más que el ✓, para que se alcance a ver.
const PULL_OFFLINE_MS = 1100;

/** Curva de goma (la de iOS): crece casi 1:1 al principio y se endurece hacia el tope. */
function rubberBand(distance: number): number {
  return PULL_MAX_OFFSET * (1 - 1 / ((distance * PULL_RUBBER) / PULL_MAX_OFFSET + 1));
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const transactions = useFinanceStore((s) => s.transactions);
  // "Mostrar ingresos" apagado en la lista activa: la lista es solo de gastos (un viaje…). Los
  // ingresos salen antes de todo (lista, balance, tira, gráfica y pills).
  const showIncome = useSettingsStore(
    (s) => s.lists.find((l) => l.id === s.activeListId)?.showIncome !== false,
  );
  const visibleTransactions = useMemo(
    () => (showIncome ? transactions : transactions.filter((t) => t.amount > 0)),
    [showIncome, transactions],
  );
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const allListCategories = useAllListCategories();
  const resetExpense = useExpenseStore((s) => s.reset);
  const setExpenseCategory = useExpenseStore((s) => s.setCategory);
  const paymentMethods = useSettingsStore((s) => s.paymentMethods);
  const savingsGoals = useSettingsStore((s) => s.savingsGoals);
  const debts = useSettingsStore((s) => s.debts);
  const totalDebt = useMemo(() => debts.reduce((sum, d) => sum + d.remainingAmount, 0), [debts]);
  const styles = useMemo(() => createStyles(theme), [theme]);

  // ── Detalle de transacción (long-press) ──────────────────────────────────
  const [detailTx, setDetailTx] = useState<TransactionRow | null>(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<TransactionRow | null>(null);

  // ── Filtros de período y tipo ────────────────────────────────────────────
  const {
    cadence,
    periodView,
    setPeriodView,
    resetPeriod,
    isDefault,
    periodRange,
    periodLabel,
    stripItems,
    stripIndex,
    typeFilter,
    handlePillPress,
    filteredTransactions,
    typeFilteredTransactions,
    isCurrentPeriod,
  } = useTransactionFilters(visibleTransactions);

  // ── Período: tira, menú del calendario, rango y período predeterminado ──
  const reducedMotion = useReducedMotion();
  const [stripVisible, setStripVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [rangeSheetOpen, setRangeSheetOpen] = useState(false);
  const [defaultSheetOpen, setDefaultSheetOpen] = useState(false);
  const calendarBtnRef = useRef<View>(null);
  const hasStrip = periodView.kind === "cycle" || periodView.kind === "year";
  const stripShown = stripVisible && hasStrip;

  const openPeriodMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    calendarBtnRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height });
      setMenuOpen(true);
    });
  }, []);

  const handleCalendarPress = useCallback(() => {
    // Sin tira que mostrar (todo el tiempo / rango), el toque abre el menú directo.
    if (!hasStrip) {
      openPeriodMenu();
      return;
    }
    Haptics.selectionAsync();
    setStripVisible((v) => !v);
  }, [hasStrip, openPeriodMenu]);

  const handleResetPeriod = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetPeriod();
  }, [resetPeriod]);

  const handleMenuAction = useCallback(
    (action: PeriodMenuAction) => {
      setMenuOpen(false);
      // El menú es otro Modal: abrir una hoja mientras todavía se cierra da saltos en Android.
      const afterClose = (fn: () => void) => setTimeout(fn, 160);
      switch (action) {
        case "cycle":
          setPeriodView({ kind: "cycle", offset: 0 });
          setStripVisible(true);
          break;
        case "year":
          setPeriodView({ kind: "year", year: new Date().getFullYear() });
          setStripVisible(true);
          break;
        case "all":
          setPeriodView({ kind: "all" });
          break;
        case "range":
          afterClose(() => setRangeSheetOpen(true));
          break;
        case "reset":
          resetPeriod();
          break;
        case "changeDefault":
          afterClose(() => setDefaultSheetOpen(true));
          break;
      }
    },
    [setPeriodView, resetPeriod],
  );

  // ── Listas: selector "Personal ▾", menú, crear/editar/eliminar ──────────
  const lists = useSettingsStore((s) => s.lists);
  const activeListId = useSettingsStore((s) => s.activeListId);
  const activeList = lists.find((l) => l.id === activeListId) ?? lists[0];
  const listById = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const memberNameById = useMemo(
    () => new Map(lists.flatMap((l) => (l.members ?? []).map((m) => [m.id, m.name] as const))),
    [lists],
  );
  const listBtnRef = useRef<View>(null);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [listMenuAnchor, setListMenuAnchor] = useState<MenuAnchor | null>(null);
  // Crear/editar/borrar listas (compartido con "Tus listas" de Ajustes). Al cambiar de lista,
  // la tira de períodos de la anterior no significa nada aquí.
  const listEditor = useListEditor({ onListChanged: () => setStripVisible(false) });
  const [settleSheetOpen, setSettleSheetOpen] = useState(false);

  const openListMenu = useCallback(() => {
    Haptics.selectionAsync();
    listBtnRef.current?.measureInWindow((x, y, width, height) => {
      setListMenuAnchor({ x, y, width, height });
      setListMenuOpen(true);
    });
  }, []);

  const handleSelectList = useCallback(
    (id: string) => {
      setListMenuOpen(false);
      if (id !== activeListId) listEditor.goToList(id);
    },
    [activeListId, listEditor],
  );

  // Cuentas de la lista activa si tiene más personas: sobre todo su historial (no el período).
  const { settlement, payerLabel } = useActiveListSettlement();
  const shareActiveList = useShareActiveList();

  // Las deudas son del día a día: el patrimonio neto solo se muestra en Personal.
  const listDebt = activeListId === DEFAULT_LIST_ID ? totalDebt : 0;

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  const baseSearchBottom = Math.max(insets.bottom, 0) + DOCK_BOTTOM_OFFSET + DOCK_HEIGHT + 10;
  const {
    searchInputRef,
    tagDropdownOpen,
    searchBarAnim,
    keyboardExtraAnim,
    searchBarOpacity,
    tagSuggestions,
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
  } = useDashboardSearch({
    transactions: visibleTransactions,
    typeFilteredTransactions,
    baseSearchBottom,
  });

  // ── Totales y estadísticas ───────────────────────────────────────────────
  const {
    expenseTotal,
    incomeTotal,
    netBalance,
    periodNet,
    allTimeNetBalance,
    budgetPct,
    activeStats,
    activeTotalForChart,
    activeBudget,
    budgetSpentByCategory,
    allEmojis,
    overBudgetAmount,
    expectedPayAmount,
    payReceived,
    categoryFilterAllTimeNet,
  } = useDashboardTotals({
    transactions: visibleTransactions,
    filteredTransactions,
    typeFilteredTransactions,
    searchedTransactions,
    isSearching,
    typeFilter,
    viewedCycle: periodView.kind === "cycle" ? periodRange : null,
    categoryFilter,
  });
  // Si se ocultan los ingresos estando en el pill de ingresos, vuelve a la vista normal.
  useEffect(() => {
    if (!showIncome && typeFilter === "income") handlePillPress("income");
  }, [showIncome, typeFilter, handlePillPress]);

  // Compartir (menú de listas): resumen de lo que se ve de la lista activa. En la fase de
  // listas compartidas en la nube, este mismo botón enviará el link de invitación.
  const handleShareList = useCallback(
    () => shareActiveList({ periodLabel, expense: payReceived - periodNet, income: payReceived }),
    [shareActiveList, periodLabel, payReceived, periodNet],
  );

  const showPayBar =
    expectedPayAmount > 0 && !isSearching && !categoryFilter && typeFilter === null;

  // ── Scroll y animaciones ─────────────────────────────────────────────────
  const { scrollY, scrollHandler, headerParallaxStyle, pillsParallaxStyle, chartAnimKey } =
    useDashboardScroll(typeFilter, periodLabel);

  // ── Tour de onboarding ───────────────────────────────────────────────────
  const { dashboardTourSteps, dashboardTourVisible, dashboardTourIndex, completeOnboarding } =
    useDashboardTour();

  // ── Filtro por categoría (tap corto en columna del chart) ───────────────
  const setCategoryFilter = useUIStore((s) => s.setCategoryFilter);

  const handleCategoryTap = useCallback(
    (emoji: string, name: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCategoryFilter({ emoji, name });
    },
    [setCategoryFilter],
  );

  // Botón atrás del dispositivo: cierra primero el filtro de categoría
  useEffect(() => {
    if (!categoryFilter) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      clearCategoryFilter();
      return true;
    });
    return () => sub.remove();
  }, [categoryFilter, clearCategoryFilter]);

  // ── Pull-down para salir del filtro de categoría ─────────────────────────
  // En Android el ScrollView nativo se queda con cualquier arrastre vertical (incluido el
  // estiramiento del borde) y cancela los toques de JS antes de que un PanResponder llegue
  // a su umbral: el pull-down casi nunca se activaba. Por eso, con filtro activo y la lista
  // en el tope, el scroll nativo se desactiva y el gesto entero lo maneja JS: hacia abajo
  // anima el emoji del encabezado → "x" y suelta pasado el umbral quita el filtro; hacia
  // arriba desplaza la lista a mano, y al despegarse del tope el scroll nativo vuelve.
  const listRef = useAnimatedRef<Reanimated.FlatList<ListRowItem>>();
  const [atTop, setAtTop] = useState(true);
  useAnimatedReaction(
    () => scrollY.value <= 4,
    (isTop, prev) => {
      "worklet";
      if (isTop !== prev) runOnJS(setAtTop)(isTop);
    },
    [scrollY],
  );
  // Deslizar hacia abajo sobre la LISTA solo quita el filtro de categoría. Traer cambios de la
  // cuenta (Sync Fase 3/4) es deslizar sobre el BALANCE: ver syncPan más abajo.
  const { user: sessionUser } = useSession();
  const pullMode = atTop && !!categoryFilter;

  // ── Deslizar el balance para traer cambios ───────────────────────────────
  // El balance y la lista bajan con el dedo, con una resistencia que crece (curva de goma);
  // pasado PULL_HOLD_OFFSET, al soltar se quedan ahí con el indicador girando y vuelven a subir
  // con un resorte al terminar. La fila de íconos de arriba no se mueve.
  const syncEnabled = !!sessionUser && !categoryFilter && !isSearching;
  const [syncPhase, setSyncPhase] = useState<SyncPullPhase>("idle");
  const syncPhaseRef = useRef<SyncPullPhase>("idle");
  const setPhase = useCallback((phase: SyncPullPhase) => {
    syncPhaseRef.current = phase;
    setSyncPhase(phase);
  }, []);
  // Cuánto bajó el contenido y cuánto falta para soltar y traer. Reanimated (hilo de UI): el
  // balance tiene animaciones de Reanimated adentro que pisaban un `Animated` de RN desde JS.
  const pullOffset = useSharedValue(0);
  const pullProgress = useSharedValue(0);
  const syncArmedRef = useRef(false);
  const pulledStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pullOffset.value }],
  }));

  const springPullOffset = useCallback(
    (toValue: number, onDone?: () => void) => {
      // Una sola vez: al terminar el resorte o, si se interrumpe, por el respaldo de tiempo (así
      // el estado nunca queda trabado ni un respaldo viejo corta un gesto nuevo).
      let called = false;
      const done = () => {
        if (called) return;
        called = true;
        onDone?.();
      };
      // Bajar a la posición de espera: firme, sin rebote. Volver: con un rebote suave.
      const config =
        toValue === 0 ? { stiffness: 220, damping: 18 } : { stiffness: 320, damping: 30 };
      pullOffset.value = withSpring(toValue, config, (finished) => {
        if (finished && onDone) runOnJS(done)();
      });
      if (onDone) setTimeout(done, 900);
    },
    [pullOffset],
  );

  const pullToSync = useCallback(() => {
    setPhase("refreshing");
    pullProgress.value = 1;
    springPullOffset(PULL_HOLD_OFFSET);
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const synced = Promise.race([syncNow().catch(() => undefined), wait(PULL_MAX_WAIT_MS)]);
    Promise.all([synced, wait(PULL_MIN_REFRESH_MS)]).then(() => {
      // "syncing" aquí = pasó el tope sin respuesta: igual que sin conexión.
      const ok = useSyncStatus.getState().phase === "idle";
      setPhase(ok ? "done" : "offline");
      Haptics.notificationAsync(
        ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
      );
      setTimeout(
        () =>
          springPullOffset(0, () => {
            if (syncPhaseRef.current === "done" || syncPhaseRef.current === "offline") {
              setPhase("idle");
            }
          }),
        ok ? PULL_DONE_MS : PULL_OFFLINE_MS,
      );
    });
  }, [pullProgress, setPhase, springPullOffset]);

  const syncPan = useMemo(
    () =>
      PanResponder.create({
        // Solo un gesto hacia abajo y vertical: los toques (pills, chip de cuentas, tira de
        // períodos) y los deslizamientos horizontales siguen funcionando.
        // En captura: gana a los botones de adentro (pills, chip de cuentas) en cuanto el dedo
        // baja; así el "soltar" siempre llega aquí.
        onMoveShouldSetPanResponderCapture: (_, gs) =>
          syncEnabled &&
          syncPhaseRef.current === "idle" &&
          gs.dy > 8 &&
          gs.dy > Math.abs(gs.dx) * 1.4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          syncArmedRef.current = false;
          setPhase("pulling");
        },
        onPanResponderMove: (_, gs) => {
          const offset = rubberBand(Math.max(gs.dy, 0));
          pullOffset.value = offset;
          const progress = Math.min(offset / PULL_HOLD_OFFSET, 1);
          pullProgress.value = progress;
          const armed = progress >= 1;
          if (armed !== syncArmedRef.current) {
            syncArmedRef.current = armed;
            Haptics.impactAsync(
              armed ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
            );
          }
        },
        onPanResponderRelease: () => {
          if (syncArmedRef.current) {
            pullToSync();
            return;
          }
          springPullOffset(0, () => {
            if (syncPhaseRef.current === "pulling") setPhase("idle");
          });
        },
        onPanResponderTerminate: () => {
          springPullOffset(0, () => setPhase("idle"));
        },
      }),
    [syncEnabled, pullOffset, pullProgress, pullToSync, setPhase, springPullOffset],
  );

  // 0 → 1 a los PULL_CLEAR_DISTANCE px: alimenta la transición emoji → "x" del encabezado.
  const pullDownProgress = useRef(new Animated.Value(0)).current;
  const pullArmedRef = useRef(false);
  const resetPullDownProgress = useCallback(() => {
    pullArmedRef.current = false;
    Animated.spring(pullDownProgress, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [pullDownProgress]);

  const scrollListTo = useCallback(
    (y: number, animated: boolean) => {
      runOnUI(() => {
        "worklet";
        scrollTo(listRef, 0, y, animated);
      })();
    },
    [listRef],
  );

  const pullDownPan = useMemo(
    () =>
      PanResponder.create({
        // Captura solo gestos verticales: taps y swipes horizontales de las filas siguen igual.
        onMoveShouldSetPanResponderCapture: (_, gs) =>
          pullMode && Math.abs(gs.dy) > 6 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2,
        onPanResponderTerminationRequest: () => true,
        onPanResponderMove: (_, gs) => {
          if (gs.dy <= 0) {
            pullDownProgress.setValue(0);
            scrollListTo(-gs.dy, false);
            return;
          }
          const progress = Math.min(gs.dy / PULL_CLEAR_DISTANCE, 1);
          pullDownProgress.setValue(progress);
          const armed = progress >= 1;
          if (armed !== pullArmedRef.current) {
            pullArmedRef.current = armed;
            if (armed) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        },
        onPanResponderRelease: (_, gs) => {
          const armed = pullArmedRef.current;
          resetPullDownProgress();
          if (gs.dy < 0) {
            // Conserva algo de inercia del gesto al soltar hacia arriba.
            scrollListTo(Math.max(-gs.dy - gs.vy * 220, 0), true);
          } else if (armed) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            clearCategoryFilter();
          }
        },
        onPanResponderTerminate: resetPullDownProgress,
      }),
    [pullMode, clearCategoryFilter, pullDownProgress, resetPullDownProgress, scrollListTo],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleNewTransactionFromChart(emoji: string, categoryName: string) {
    resetExpense();
    setExpenseCategory(emoji, categoryName);
    router.push("/active-expense");
  }

  // La lista va agrupada por día: un encabezado ("Hoy", "Ayer", "lun 22 sep") con el neto
  // del día, y debajo sus movimientos.
  const listRows = useMemo(
    () => groupTransactionsByDay(displayedTransactions),
    [displayedTransactions],
  );
  const keyExtractor = useCallback((item: ListRowItem) => item.key, []);

  const handleDetail = useCallback((tx: TransactionRow) => setDetailTx(tx), []);

  const handleDeleteTransaction = useCallback(
    async (id: number) => {
      const tx = transactions.find((t) => t.id === id);
      await deleteTransaction(id);
      if (!tx) return;
    },
    [transactions, deleteTransaction],
  );

  const handleEditTransaction = useCallback((tx: TransactionRow) => {
    router.push(`/active-expense?editId=${tx.id}`);
  }, []);

  const renderItem = useCallback(
    ({ item: row, index }: { item: ListRowItem; index: number }) => {
      if (row.kind === "day") {
        return (
          <View style={styles.dayGroupHeader}>
            <Text style={styles.dayGroupLabel}>{row.label}</Text>
            <Text style={[styles.dayGroupNet, row.net > 0 && styles.dayGroupNetPositive]}>
              {row.net < 0 ? "-" : row.net > 0 ? "+" : ""}
              {formatBalance(Math.abs(row.net))}
            </Text>
          </View>
        );
      }
      const item = row.tx;
      return (
        <View style={styles.txItem}>
          <TransactionItem
            transaction={item}
            index={index}
            dimmed={false}
            onDelete={handleDeleteTransaction}
            onEdit={handleEditTransaction}
            onDetail={handleDetail}
            listBadge={
              // Personal ve todas las listas: marca de dónde viene cada movimiento ajeno.
              activeListId === DEFAULT_LIST_ID && item.list_id !== DEFAULT_LIST_ID
                ? (listById.get(item.list_id) ?? null)
                : null
            }
            payerName={
              item.paid_by !== SELF_PAYER ? (memberNameById.get(item.paid_by) ?? null) : null
            }
          />
        </View>
      );
    },
    [
      handleDeleteTransaction,
      handleEditTransaction,
      handleDetail,
      styles.txItem,
      styles.dayGroupHeader,
      styles.dayGroupLabel,
      styles.dayGroupNet,
      styles.dayGroupNetPositive,
      activeListId,
      listById,
      memberNameById,
    ],
  );

  // ── Derivados de estado ───────────────────────────────────────────────────
  const isNewPeriod = filteredTransactions.length === 0 && isCurrentPeriod && !isSearching;
  const shownBalance = isSearching
    ? netBalance
    : categoryFilter
      ? (categoryFilterAllTimeNet ?? 0)
      : periodNet;
  const newPeriodMessage =
    periodView.kind === "year"
      ? "Nuevo año, ¡comienza ahora!"
      : periodView.kind !== "cycle"
        ? "¡Comienza ahora!"
        : cadence.type === "weekly"
          ? "Nueva semana, ¡comienza ahora!"
          : cadence.type === "monthly" || cadence.type === "all"
            ? "Nuevo mes, ¡comienza ahora!"
            : "Nuevo período, ¡comienza ahora!";

  // ── ListHeader ────────────────────────────────────────────────────────────
  const listHeader = (
    <>
      {/* Chart: oculto durante búsqueda o filtro de categoría */}
      {!isSearching && !categoryFilter && (
        <View style={styles.chartWrapper}>
          {isNewPeriod && (
            <View style={styles.newPeriodOverlay}>
              <Text style={styles.newPeriodText}>{newPeriodMessage}</Text>
              <Text style={styles.newPeriodSub}>
                Registra tu primer movimiento con + o el micrófono
              </Text>
            </View>
          )}
          <View
            style={[
              isNewPeriod ? { opacity: 0.18 } : undefined,
              { paddingTop: 8, paddingBottom: 16 },
            ]}
          >
            <CategoryChart
              stats={activeStats}
              allEmojis={allEmojis}
              totalExpenses={activeTotalForChart}
              budgetByCategory={activeBudget}
              budgetSpentByCategory={budgetSpentByCategory}
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
            {isSearching
              ? "RESULTADOS"
              : categoryFilter
                ? categoryFilter.name.toUpperCase()
                : typeFilter === "expense"
                  ? "GASTOS"
                  : typeFilter === "income"
                    ? "INGRESOS"
                    : "RECIENTE"}
          </Text>
          <Text style={styles.dayLabelRight}>
            {isSearching
              ? `${searchedTransactions.length} encontrados`
              : categoryFilter
                ? `${displayedTransactions.length} ${displayedTransactions.length === 1 ? "registro" : "registros"}`
                : periodLabel.toUpperCase()}
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
              ? "Toca el calendario de arriba para ver otro período"
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
        {/* Selector de lista: absoluto a la izquierda, simétrico a los íconos de la derecha */}
        <View style={styles.listSelectorWrap}>
          <Pressable
            ref={listBtnRef}
            collapsable={false}
            onPress={openListMenu}
            style={styles.listSelector}
            accessibilityRole="button"
            accessibilityLabel={`Lista: ${activeList.name}`}
            accessibilityHint="Toca para cambiar de lista o crear una nueva"
          >
            {activeListId !== DEFAULT_LIST_ID && (
              <Text style={styles.listSelectorEmoji}>{activeList.emoji}</Text>
            )}
            <Text style={styles.listSelectorText} numberOfLines={1}>
              {activeList.name}
            </Text>
            <ChevronDown size={16} color={theme.textSub} strokeWidth={2.2} />
          </Pressable>
        </View>
        {/* Íconos: posición absoluta para no afectar el centrado del contenido */}
        <View style={styles.headerActions}>
          <NotificationBadgeBtn />
          {/* Filtro de categoría activo: su emoji + "x" para salir (mismo patrón que el
              botón de período con filtro). */}
          {categoryFilter && (
            <Reanimated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(200)}
              exiting={reducedMotion ? undefined : FadeOutUp.duration(160)}
              style={[styles.periodBtnGroup, styles.periodBtnGroupActive]}
            >
              {/* Al deslizar la lista hacia abajo, el emoji se transforma en una "x" roja
                  (pullDownProgress 0 → 1); al soltar pasado el umbral se quita el filtro. */}
              <Animated.View
                style={[
                  styles.settingsBtn,
                  {
                    transform: [
                      {
                        scale: pullDownProgress.interpolate({
                          inputRange: [0, 0.9, 1],
                          outputRange: [1, 1.04, 1.12],
                        }),
                      },
                    ],
                  },
                ]}
                accessible
                accessibilityLabel={`Filtro: ${categoryFilter.name}`}
              >
                <Animated.View
                  style={[styles.catFilterDangerBg, { opacity: pullDownProgress }]}
                  pointerEvents="none"
                />
                <Animated.Text
                  style={[
                    styles.catFilterHeaderEmoji,
                    {
                      opacity: pullDownProgress.interpolate({
                        inputRange: [0, 0.6],
                        outputRange: [1, 0],
                        extrapolate: "clamp",
                      }),
                      transform: [
                        {
                          scale: pullDownProgress.interpolate({
                            inputRange: [0, 0.6],
                            outputRange: [1, 0.4],
                            extrapolate: "clamp",
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {categoryFilter.emoji}
                </Animated.Text>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.catFilterPullX,
                    {
                      opacity: pullDownProgress.interpolate({
                        inputRange: [0.4, 1],
                        outputRange: [0, 1],
                        extrapolate: "clamp",
                      }),
                      transform: [
                        {
                          scale: pullDownProgress.interpolate({
                            inputRange: [0.4, 1],
                            outputRange: [0.4, 1],
                            extrapolate: "clamp",
                          }),
                        },
                        {
                          rotate: pullDownProgress.interpolate({
                            inputRange: [0.4, 1],
                            outputRange: ["-90deg", "0deg"],
                            extrapolate: "clamp",
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <X size={20} color="#DC2626" strokeWidth={2.8} />
                </Animated.View>
              </Animated.View>
              {/* Durante el pull-down el emoji ya se vuelve la "x": esta se oculta para no
                  mostrar dos. */}
              <Animated.View
                style={{
                  opacity: pullDownProgress.interpolate({
                    inputRange: [0, 0.25],
                    outputRange: [1, 0],
                    extrapolate: "clamp",
                  }),
                }}
              >
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    clearCategoryFilter();
                  }}
                  hitSlop={8}
                  style={styles.clearFilterBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar filtro de categoría ${categoryFilter.name}`}
                >
                  <X size={14} color={theme.textSub} strokeWidth={2.4} />
                </Pressable>
              </Animated.View>
            </Reanimated.View>
          )}
          {/* Período: toque = mostrar/ocultar la tira; toque largo = menú. Con un
              filtro distinto del predeterminado: punto rojo + "x" para quitarlo. */}
          <View ref={getTourRef(TOUR_KEYS.PERIOD_BTN)} collapsable={false}>
            <Reanimated.View
              ref={calendarBtnRef}
              collapsable={false}
              layout={reducedMotion ? undefined : LinearTransition.duration(200)}
              style={[styles.periodBtnGroup, !isDefault && styles.periodBtnGroupActive]}
            >
              <Pressable
                style={styles.settingsBtn}
                onPress={handleCalendarPress}
                onLongPress={openPeriodMenu}
                delayLongPress={320}
                accessibilityRole="button"
                accessibilityLabel={`Período: ${periodLabel}`}
                accessibilityHint="Toca para ver los períodos; mantén presionado para más opciones"
              >
                <Calendar size={22} color={theme.text} strokeWidth={1.6} />
                {!isDefault && <View style={styles.filterDot} />}
              </Pressable>
              {!isDefault && (
                <Pressable
                  onPress={handleResetPeriod}
                  hitSlop={8}
                  style={styles.clearFilterBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar filtro de período"
                >
                  <X size={14} color={theme.textSub} strokeWidth={2.4} />
                </Pressable>
              )}
            </Reanimated.View>
          </View>
          <View ref={getTourRef(TOUR_KEYS.SETTINGS_BTN)} collapsable={false}>
            <Pressable style={styles.settingsBtn} onPress={() => router.push("/settings")}>
              <Settings size={22} color={theme.text} strokeWidth={1.6} />
            </Pressable>
          </View>
        </View>

        {/* Deslizar el balance hacia abajo trae los cambios (con sesión, sin filtro). */}
        <Reanimated.View style={[styles.headerLeft, pulledStyle]} {...syncPan.panHandlers}>
          {stripShown && (
            <Reanimated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(220)}
              exiting={reducedMotion ? undefined : FadeOutUp.duration(160)}
              style={styles.stripWrapper}
            >
              <PeriodStrip
                // Remontar al cambiar de ciclos a años (u otra frecuencia): mismo motivo que
                // en PayPeriodForm, el resaltado quedaba en la posición de la lista anterior.
                key={`${periodView.kind}-${cadence.type}-${stripItems[0]?.key}-${stripItems.length}`}
                items={stripItems}
                selectedIndex={stripIndex}
                onSelect={(i) => setPeriodView(stripItems[i].view)}
              />
            </Reanimated.View>
          )}
          {!stripShown && !isDefault && (
            <Reanimated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(200)}
              exiting={reducedMotion ? undefined : FadeOutUp.duration(140)}
            >
              <Pressable
                onPress={handleCalendarPress}
                style={styles.periodChip}
                accessibilityRole="button"
              >
                <Text style={styles.periodChipText}>{periodLabel}</Text>
              </Pressable>
            </Reanimated.View>
          )}
          <Reanimated.View
            layout={reducedMotion ? undefined : LinearTransition.duration(220)}
            style={[styles.balanceSection, headerParallaxStyle as object]}
          >
            {showPayBar && overBudgetAmount > 0 && (
              <View style={styles.overBudgetBanner}>
                <Text style={styles.overBudgetText}>
                  {formatBalance(overBudgetAmount)} sobre tu pago
                </Text>
              </View>
            )}
            <Text style={styles.balanceLabel}>
              {isSearching
                ? `BÚSQUEDA  ·  ${searchedTransactions.length} resultado${searchedTransactions.length !== 1 ? "s" : ""}`
                : categoryFilter
                  ? `${categoryFilter.name.toUpperCase()}  ·  TODO EL TIEMPO`
                  : "BALANCE NETO"}
            </Text>
            {/* El balance sigue el período visto (ingresos − gastos del mes/año/rango);
                en una búsqueda, el neto de los resultados. El saldo real de todo el
                historial queda debajo, para no perderlo al mirar otro período. */}
            <RollingNumber
              value={Math.abs(shownBalance)}
              prefix={shownBalance < 0 ? "-$" : "$"}
              style={[styles.balanceAmount, shownBalance < 0 && styles.balanceNegative]}
            />

            {/* Saldo total (todo el historial) y patrimonio neto (saldo − deudas
                pendientes, solo si hay deudas activas). */}
            {!isSearching && !categoryFilter && (periodView.kind !== "all" || listDebt > 0) && (
              <Text style={styles.netWorthText}>
                {[
                  periodView.kind !== "all" && `Saldo total: ${formatBalance(allTimeNetBalance)}`,
                  listDebt > 0 && `Patrimonio neto: ${formatBalance(allTimeNetBalance - listDebt)}`,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </Text>
            )}

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
                  color={typeFilter !== "income" ? moneyColors.expense.text : theme.textSub}
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

              {/* Ingreso activo solo cuando typeFilter === "income". Oculto si la lista no
                  muestra ingresos. */}
              {showIncome && (
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
                    color={typeFilter === "income" ? moneyColors.income.text : theme.textSub}
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
              )}
            </Reanimated.View>
            {/* Cuentas de una lista con más personas: una línea; el detalle, en una hoja. */}
            {settlement && !isSearching && !categoryFilter && (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSettleSheetOpen(true);
                }}
                style={styles.settleChip}
                accessibilityRole="button"
                accessibilityHint="Toca para ver el detalle de las cuentas"
              >
                <Text style={styles.settleChipText}>
                  {settlementHeadline(settlement, SELF_PAYER, payerLabel, formatBalance)}
                </Text>
                <ChevronRight size={16} color={theme.textSub} strokeWidth={2.2} />
              </Pressable>
            )}
            {/* Gastado vs pago esperado del ciclo visto, con lo recibido de verdad al lado. */}
            {showPayBar && (
              <View style={styles.budgetBar}>
                <View style={styles.budgetTrack}>
                  <View style={[styles.budgetFill, { width: `${budgetPct}%` as `${number}%` }]} />
                </View>
                <Text style={styles.budgetBarPct}>
                  {budgetPct}% de {formatBalance(expectedPayAmount)} · recibido{" "}
                  {formatBalance(payReceived)}
                </Text>
              </View>
            )}
          </Reanimated.View>
        </Reanimated.View>
        <View style={styles.syncIndicatorSlot} pointerEvents="none">
          <SyncPullIndicator
            offset={pullOffset}
            progress={pullProgress}
            phase={syncPhase}
            holdOffset={PULL_HOLD_OFFSET}
            reducedMotion={reducedMotion}
          />
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════
          LISTA — gráfica + transacciones en un solo scroll unificado
          ══════════════════════════════════════════════════════════════ */}
      <View style={styles.list} {...pullDownPan.panHandlers}>
        <Reanimated.View style={[styles.list, pulledStyle]}>
          <Reanimated.FlatList
            ref={listRef}
            scrollEnabled={!pullMode}
            data={listRows}
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
        </Reanimated.View>
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
            transform: [
              {
                translateY: searchBarAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
              },
            ],
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

      {/* Período: menú del calendario, rango personalizado y período predeterminado */}
      <PeriodMenu
        visible={menuOpen}
        anchor={menuAnchor}
        cadence={cadence}
        view={periodView}
        isDefault={isDefault}
        onAction={handleMenuAction}
        onClose={() => setMenuOpen(false)}
      />
      <DateRangeSheet
        visible={rangeSheetOpen}
        mode="days"
        title="Rango personalizado"
        initialStart={periodView.kind === "range" ? parseYMD(periodView.start) : null}
        initialEnd={periodView.kind === "range" ? parseYMD(periodView.end) : null}
        onApply={(start, end) => {
          setPeriodView({ kind: "range", start: toYMD(start), end: toYMD(end) });
          setRangeSheetOpen(false);
        }}
        onClose={() => setRangeSheetOpen(false)}
      />
      <DefaultPeriodSheet visible={defaultSheetOpen} onClose={() => setDefaultSheetOpen(false)} />
      <SettlementSheet
        visible={settleSheetOpen}
        settlement={settlement}
        selfId={SELF_PAYER}
        nameOf={payerLabel}
        onClose={() => setSettleSheetOpen(false)}
      />

      {/* Listas: menú del selector, crear/editar y confirmación de borrado */}
      <ListMenu
        visible={listMenuOpen}
        anchor={listMenuAnchor}
        lists={lists}
        activeListId={activeListId}
        onSelect={handleSelectList}
        onShare={() => {
          setListMenuOpen(false);
          // La hoja del sistema es otra Activity: se abre cuando el menú ya se cerró.
          setTimeout(handleShareList, 160);
        }}
        onEdit={() => {
          setListMenuOpen(false);
          setTimeout(() => listEditor.openEdit(activeListId), 160);
        }}
        onNew={() => {
          setListMenuOpen(false);
          setTimeout(listEditor.openNew, 160);
        }}
        onClose={() => setListMenuOpen(false)}
      />
      {listEditor.element}

      {/* Modal de detalle de transacción */}
      <TransactionDetailModal
        visible={detailTx !== null}
        onClose={() => setDetailTx(null)}
        transaction={detailTx}
        userCategories={allListCategories}
        savingsGoals={savingsGoals}
        paymentMethods={paymentMethods}
        lists={lists}
        onEdit={(tx) => {
          setDetailTx(null);
          handleEditTransaction(tx);
        }}
        onDelete={(tx) => {
          setDetailTx(null);
          // Dos Modal apilados en Android se comportan mal: confirma al cerrar la hoja.
          setTimeout(() => setConfirmDeleteTx(tx), 220);
        }}
      />
      <ConfirmDialog
        visible={confirmDeleteTx !== null}
        variant="danger"
        title="¿Eliminar movimiento?"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => {
          const tx = confirmDeleteTx;
          setConfirmDeleteTx(null);
          if (tx) handleDeleteTransaction(tx.id);
        }}
        onCancel={() => setConfirmDeleteTx(null)}
      />

      {/* Guided Tour — usa Modal interno, siempre encima de todo */}
      <GuidedTour
        steps={dashboardTourSteps}
        currentStep={dashboardTourIndex}
        globalStep={dashboardTourIndex}
        totalSteps={3}
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
    listSelectorWrap: {
      position: "absolute",
      top: 14,
      left: 20,
      zIndex: 10,
    },
    listSelector: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      height: 40,
      maxWidth: 170,
      paddingLeft: 14,
      paddingRight: 10,
      borderRadius: 9999,
      backgroundColor: t.isDark ? t.itemBg : t.surface,
      shadowColor: "#000",
      shadowOpacity: t.isDark ? 0 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: t.isDark ? 0 : 2,
    },
    listSelectorEmoji: {
      fontSize: 15,
    },
    listSelectorText: {
      flexShrink: 1,
      fontSize: 14,
      fontWeight: "600",
      color: t.text,
    },
    headerLeft: {
      flexDirection: "column",
      gap: 10,
      alignItems: "center",
    },
    settingsBtn: {
      width: 40,
      height: 40,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.isDark ? t.itemBg : t.surface,
      shadowColor: "#000",
      shadowOpacity: t.isDark ? 0 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: t.isDark ? 0 : 2,
    },

    // ── Período ─────────────────────────────────────────────────────────────
    periodBtnGroup: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 9999,
    },
    periodBtnGroupActive: {
      backgroundColor: t.isDark ? t.itemBg : t.surface,
      paddingRight: 8,
    },
    filterDot: {
      position: "absolute",
      bottom: 9,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#E53E3E",
      borderWidth: 1.5,
      borderColor: t.isDark ? t.itemBg : t.surface,
    },
    clearFilterBtn: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    stripWrapper: {
      alignSelf: "stretch",
      marginHorizontal: -28,
      marginTop: -8,
    },
    periodChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 9999,
      borderWidth: 1.5,
      borderColor: t.border,
      backgroundColor: t.isDark ? t.itemBg : t.surface,
    },
    periodChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: t.textSub,
    },

    // ── Balance ─────────────────────────────────────────────────────────────
    balanceSection: {
      gap: 8,
      alignItems: "center",
    },
    balanceLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: t.textSub,
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
    netWorthText: {
      fontSize: 12,
      fontWeight: "600",
      color: t.textSub,
      textAlign: "center",
      marginTop: -4,
    },
    overBudgetBanner: {
      backgroundColor: t.isDark ? "rgba(220,38,38,0.18)" : "rgba(186,26,26,0.1)",
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
    },
    overBudgetText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#DC2626",
      letterSpacing: 0.2,
    },

    // ── Pills ───────────────────────────────────────────────────────────────
    // Contenedor redondeado exterior que agrupa los pills Gasto/Ingreso — "dos capas" tipo iOS
    pillsRow: {
      flexDirection: "row",
      gap: 6,
      backgroundColor: t.isDark ? t.itemBg : t.surface,
      borderRadius: 999,
      padding: 5,
      shadowColor: "#000",
      shadowOpacity: t.isDark ? 0 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: t.isDark ? 0 : 2,
    },
    // Pill interno — capa de color sobre el contenedor
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
    pillExpenseActive: { backgroundColor: moneyColors.expense.bg },
    pillExpenseText: { color: moneyColors.expense.text },
    // Activo — ingreso
    pillIncomeActive: { backgroundColor: moneyColors.income.bg },
    pillIncomeText: { color: moneyColors.income.text },
    // Inactivo — gris neutro
    pillInactive: { backgroundColor: t.pillNeutral ?? "#F1F5F9" },
    pillInactiveText: { color: t.textSub, fontWeight: "600" as const },
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
    // Hueco que deja el balance al deslizarlo: empieza donde empieza el balance (paddingTop de
    // headerOuter), el indicador se centra en lo que baje.
    syncIndicatorSlot: {
      position: "absolute",
      top: 64,
      left: 0,
      right: 0,
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

    // ── Filtro de categoría activo (encabezado) ─────────────────────────────
    catFilterHeaderEmoji: {
      fontSize: 18,
      lineHeight: 22,
    },
    catFilterDangerBg: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 9999,
      backgroundColor: t.isDark ? "rgba(220,38,38,0.22)" : "#FEE2E2",
    },
    catFilterPullX: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Cabecera de sección ─────────────────────────────────────────────────
    settleChip: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: 4,
      marginTop: 10,
      paddingVertical: 6,
      paddingLeft: 14,
      paddingRight: 10,
      borderRadius: 9999,
      backgroundColor: t.isDark ? t.itemBg : t.surface,
    },
    settleChipText: { fontSize: 13, fontWeight: "600", color: t.text },
    dayGroupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 32,
      paddingTop: 14,
      paddingBottom: 8,
    },
    dayGroupLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: t.textSub,
    },
    dayGroupNet: {
      fontSize: 13,
      fontWeight: "600",
      color: t.textSub,
    },
    dayGroupNetPositive: {
      color: "#059669",
    },
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
    emptyEmoji: { fontSize: 48, marginBottom: 14 },
    emptyTitle: { fontSize: 17, fontWeight: "700", color: t.textSub, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: t.textSub, textAlign: "center", lineHeight: 21 },

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
      shadowOpacity: 0.1,
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
