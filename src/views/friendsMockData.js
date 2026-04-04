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
    emptyTitle: "You have not added any expenses yet",
    emptyDetail: "Add an expense to a shared group to start tracking.",
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
    monthLabel: "March 2026",
    sharedExpenses: [
      {
        id: "friend-expense-1",
        dateLabel: "MAR 16",
        groupName: "Love Nest",
        direction: "Doug owes you",
        amountText: "$5.00"
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
    monthLabel: "April 2026",
    sharedExpenses: [
      {
        id: "friend-expense-3",
        dateLabel: "APR 04",
        groupName: "Summer Euro Trip",
        direction: "Mina owes you",
        amountText: "$10.50",
        tone: "positive"
      },
      {
        id: "friend-expense-2",
        dateLabel: "APR 01",
        groupName: "Lake House Weekend",
        direction: "You owe Mina",
        amountText: "$12.80",
        tone: "negative"
      }
    ]
  }
];
