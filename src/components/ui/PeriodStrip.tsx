/**
 * PeriodStrip — tira horizontal deslizable de períodos (ciclos o años) con su neto.
 * El ítem centrado es el seleccionado; al soltar el deslizamiento se selecciona el que
 * quedó al centro. Cada ítem se atenúa según su distancia al centro, siguiendo el dedo
 * (Reanimated, en el hilo de UI), y cruzar de un ítem a otro da un "tick" háptico.
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { ThemedText } from "@/src/components/ui/ThemedText";
import type { PeriodStripItem } from "@/src/hooks/useTransactionFilters";
import { useAppTokens } from "@/src/theme/tokens";
import { formatBalance } from "@/src/utils/transactionFormatters";

export const STRIP_ITEM_WIDTH = 112;
export const STRIP_HEIGHT = 52;

function formatNet(net: number): string {
  if (Math.round(net) === 0) return "$0";
  return `${net > 0 ? "+" : "−"}${formatBalance(Math.abs(net))}`;
}

const StripItem = memo(function StripItem({
  item,
  index,
  scrollX,
  onPress,
}: {
  item: PeriodStripItem;
  index: number;
  scrollX: SharedValue<number>;
  onPress: (index: number) => void;
}) {
  const tokens = useAppTokens();

  const animatedStyle = useAnimatedStyle(() => {
    const dist = Math.abs(scrollX.value - index * STRIP_ITEM_WIDTH) / STRIP_ITEM_WIDTH;
    return {
      opacity: interpolate(dist, [0, 1, 2.5], [1, 0.5, 0.2], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(dist, [0, 1], [1, 0.92], Extrapolation.CLAMP) }],
    };
  });
  const bgStyle = useAnimatedStyle(() => {
    const dist = Math.abs(scrollX.value - index * STRIP_ITEM_WIDTH) / STRIP_ITEM_WIDTH;
    return { opacity: interpolate(dist, [0, 0.6], [1, 0], Extrapolation.CLAMP) };
  });

  return (
    <Pressable
      onPress={() => onPress(index)}
      style={styles.item}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}, ${formatNet(item.net)}`}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.itemBg,
          { backgroundColor: tokens.colors.surface.elevated, borderRadius: tokens.radius.lg },
          bgStyle,
        ]}
      />
      <Animated.View style={[styles.itemContent, animatedStyle]}>
        <ThemedText variant="footnote" style={styles.label} numberOfLines={1}>
          {item.label}
        </ThemedText>
        <ThemedText variant="footnote" color="secondary" style={styles.net} numberOfLines={1}>
          {formatNet(item.net)}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
});

export function PeriodStrip({
  items,
  selectedIndex,
  onSelect,
}: {
  items: PeriodStripItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const reducedMotion = useReducedMotion();
  const listRef = useRef<Animated.FlatList<PeriodStripItem>>(null);
  const [width, setWidth] = useState(0);
  const scrollX = useSharedValue(selectedIndex * STRIP_ITEM_WIDTH);
  const lastTickIndex = useSharedValue(selectedIndex);
  // Evita re-seleccionar/re-desplazar cuando el cambio de índice vino del propio gesto.
  const settledIndex = useRef(selectedIndex);

  const tick = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
      const idx = Math.round(e.contentOffset.x / STRIP_ITEM_WIDTH);
      if (idx !== lastTickIndex.value) {
        lastTickIndex.value = idx;
        runOnJS(tick)();
      }
    },
  });

  // Cambio de selección desde afuera (tap en un ítem, "Restablecer", otra vista).
  useEffect(() => {
    if (selectedIndex < 0 || selectedIndex === settledIndex.current) return;
    settledIndex.current = selectedIndex;
    lastTickIndex.value = selectedIndex;
    if (listRef.current) {
      listRef.current.scrollToOffset({
        offset: selectedIndex * STRIP_ITEM_WIDTH,
        animated: !reducedMotion,
      });
    } else {
      // La lista todavía no se montó (espera el ancho): monta ya en `contentOffset`, así
      // que solo falta que el resaltado sepa dónde está.
      scrollX.value = selectedIndex * STRIP_ITEM_WIDTH;
    }
  }, [selectedIndex, reducedMotion, lastTickIndex, scrollX]);

  const handleMomentumEnd = useCallback(
    (x: number) => {
      const idx = Math.min(Math.max(Math.round(x / STRIP_ITEM_WIDTH), 0), items.length - 1);
      if (idx !== settledIndex.current) {
        settledIndex.current = idx;
        onSelect(idx);
      }
    },
    [items.length, onSelect],
  );

  const handlePress = useCallback(
    (index: number) => {
      if (index === settledIndex.current) return;
      settledIndex.current = index;
      lastTickIndex.value = index;
      Haptics.selectionAsync();
      listRef.current?.scrollToOffset({
        offset: index * STRIP_ITEM_WIDTH,
        animated: !reducedMotion,
      });
      onSelect(index);
    },
    [onSelect, reducedMotion, lastTickIndex],
  );

  const sidePadding = Math.max((width - STRIP_ITEM_WIDTH) / 2, 0);

  return (
    <View
      style={styles.container}
      onLayout={(e: LayoutChangeEvent) => {
        setWidth(e.nativeEvent.layout.width);
        scrollX.value = settledIndex.current * STRIP_ITEM_WIDTH;
      }}
    >
      {width > 0 && (
        <Animated.FlatList
          ref={listRef}
          data={items}
          keyExtractor={(it) => it.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={STRIP_ITEM_WIDTH}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: sidePadding }}
          getItemLayout={(_, index) => ({
            length: STRIP_ITEM_WIDTH,
            offset: STRIP_ITEM_WIDTH * index,
            index,
          })}
          contentOffset={{ x: selectedIndex * STRIP_ITEM_WIDTH, y: 0 }}
          initialNumToRender={9}
          windowSize={5}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => handleMomentumEnd(e.nativeEvent.contentOffset.x)}
          // Soltar sin impulso no dispara onMomentumScrollEnd: seleccionar igual.
          onScrollEndDrag={(e) => {
            if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.x) < 0.05) {
              handleMomentumEnd(e.nativeEvent.contentOffset.x);
            }
          }}
          renderItem={({ item, index }) => (
            <StripItem item={item} index={index} scrollX={scrollX} onPress={handlePress} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: STRIP_HEIGHT, alignSelf: "stretch" },
  item: {
    width: STRIP_ITEM_WIDTH,
    height: STRIP_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBg: { marginHorizontal: 6, marginVertical: 2 },
  itemContent: { alignItems: "center", paddingHorizontal: 10 },
  label: { fontWeight: "700", fontSize: 13 },
  net: { fontSize: 11, marginTop: 1 },
});
