import { View, Text, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell } from "lucide-react-native";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { BudgetBar } from "@/src/components/ui/BudgetBar";
import { ActionPills } from "@/src/components/ui/ActionPills";
import { TransactionItem } from "@/src/components/ui/TransactionItem";
import { FloatingInput } from "@/src/components/ui/FloatingInput";
import { COLORS } from "@/src/constants/theme";

function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DashboardScreen() {
  const transactions = useFinanceStore((s) => s.transactions);
  const getTotalBalance = useFinanceStore((s) => s.getTotalBalance);
  const getBudgetPercentage = useFinanceStore((s) => s.getBudgetPercentage);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);

  const total = getTotalBalance();
  const budgetPct = getBudgetPercentage();
  const recentTransactions = transactions.slice(0, 10);

  return (
    <SafeAreaView className="flex-1 bg-pearl" edges={["top"]}>
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-40"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-2 pb-1">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#E8E8ED] items-center justify-center mr-3">
                <Text className="text-base">👤</Text>
              </View>
              <Text className="text-[11px] font-semibold tracking-widest text-silver uppercase">
                Hola, Alex
              </Text>
            </View>
            <Bell size={20} color={COLORS.midnight} strokeWidth={1.8} />
          </View>

          {/* Hero Balance */}
          <View className="px-6 pt-5 pb-1">
            <Text className="text-[13px] text-silver mb-1">
              Gastos de este mes
            </Text>
            <Text className="text-[42px] font-bold text-midnight tracking-tight leading-none">
              {formatCurrency(total)}
            </Text>

            <BudgetBar percentage={budgetPct} />
          </View>

          {/* Action Pills */}
          <View className="px-6">
            <ActionPills />
          </View>

          {/* Recent Activity */}
          <View className="px-6 mt-7">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[15px] font-semibold text-midnight">
                Actividad Reciente
              </Text>
              <Text className="text-[13px] font-medium text-accent">
                Ver todo
              </Text>
            </View>

            {recentTransactions.length === 0 ? (
              <View className="items-center py-12">
                <Text className="text-4xl mb-3">💸</Text>
                <Text className="text-silver text-[14px] text-center">
                  Aún no hay gastos.{"\n"}Escribe algo abajo para empezar.
                </Text>
              </View>
            ) : (
              recentTransactions.map((tx, index) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  index={index}
                  onLongPress={deleteTransaction}
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* Floating Input */}
        <View className="absolute bottom-24 left-0 right-0">
          <FloatingInput />
        </View>
      </View>
    </SafeAreaView>
  );
}
