interface ExpenseWithSplits {
  paidById: string
  splits: { userId: string; amount: any }[]
}

export function computeGroupBalances(expenses: ExpenseWithSplits[]): Record<string, number> {
  const balances: Record<string, number> = {}

  for (const expense of expenses) {
    const payerId = expense.paidById

    for (const split of expense.splits) {
      const owerId = split.userId
      const owedAmount = parseFloat(split.amount)

      if (owerId === payerId) continue

      balances[payerId] = (balances[payerId] || 0) + owedAmount
      balances[owerId] = (balances[owerId] || 0) - owedAmount
    }
  }

  return balances
}
