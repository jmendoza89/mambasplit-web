export const initialFriendDirectory = [
  {
    id: "friend-julio",
    name: "julio",
    email: "julio@mambatech.io",
    status: "pending",
    statusLabel: "Invite pending",
    balanceCents: 0,
    summary: "You are all settled up",
    sharedGroups: [],
    note: "Invite is still pending, but you can already add shared expenses with Julio.",
    emptyTitle: "You have not added any expenses yet",
    emptyDetail: "To add a new expense, click the orange Add Expense button.",
    sharedExpenses: []
  },
  {
    id: "friend-doug",
    name: "Doug Rosenberger",
    email: "douros03@live.com",
    status: "accepted",
    statusLabel: "Friend",
    balanceCents: 500,
    summary: "Doug owes you $5.00",
    sharedGroups: ["Love Nest"],
    note: "You and Doug are already connected and share expenses in Love Nest.",
    monthLabel: "March 2026",
    sharedExpenses: [
      {
        id: "friend-expense-1",
        dateLabel: "MAR 16",
        groupName: "Love Nest",
        description: "All expenses before this date have been settled up.",
        direction: "Doug owes you",
        amountText: "$5.00",
        settledLinkLabel: "Show settled expenses"
      }
    ]
  },
  {
    id: "friend-mina",
    name: "Mina Torres",
    email: "mina@example.com",
    status: "accepted",
    statusLabel: "Friend",
    balanceCents: -230,
    summary: "You owe Mina $2.30",
    sharedGroups: ["Lake House Weekend", "Summer Euro Trip"],
    note: "Across all shared groups, Mina's balances net out so you only owe the difference.",
    monthLabel: "April 2026",
    sharedExpenses: [
      {
        id: "friend-expense-3",
        dateLabel: "APR 04",
        groupName: "Summer Euro Trip",
        description: "Mina covered museum tickets and you are owed back for your share.",
        direction: "Mina owes you",
        amountText: "$10.50",
        tone: "positive"
      },
      {
        id: "friend-expense-2",
        dateLabel: "APR 01",
        groupName: "Lake House Weekend",
        description: "Rental deposit split is still open.",
        direction: "You owe Mina",
        amountText: "$12.80",
        tone: "negative"
      }
    ]
  }
];
