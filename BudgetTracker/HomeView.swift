```swift
import SwiftUI

@Observable
final class AppStore {
    var transactions: [Transaction] = []
    var categories: [Category] = []
    var currentBalance: Double = 0.0

    func fetchData() async {
        // Simulate network request
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        transactions = [
            Transaction(id: UUID(), amount: -25.50, category: "Groceries", date: Date().addingTimeInterval(-86400), description: "Weekly groceries"),
            Transaction(id: UUID(), amount: -12.99, category: "Dining", date: Date().addingTimeInterval(-172800), description: "Dinner with friends"),
            Transaction(id: UUID(), amount: -50.00, category: "Shopping", date: Date().addingTimeInterval(-259200), description: "New clothes")
        ]
        categories = [
            Category(name: "Groceries", totalSpent: 25.50),
            Category(name: "Dining", totalSpent: 12.99),
            Category(name: "Shopping", totalSpent: 50.00)
        ]
        currentBalance = 1234.56
    }
}

struct Transaction: Identifiable {
    let id: UUID
    let amount: Double
    let category: String
    let date: Date
    let description: String
}

struct Category: Identifiable {
    let id = UUID()
    let name: String
    let totalSpent: Double
}

struct HomeView: View {
    @Environment(AppStore.self) var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Balance Card
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Current Balance")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        Text("$\(store.currentBalance, specifier: "%.2f")")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)

                    // Recent Transactions
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Recent Transactions")
                                .font(.headline)

                            Spacer()

                            NavigationLink {
                                TransactionsView()
                            } label: {
                                Text("See All")
                                    .font(.subheadline)
                                    .foregroundStyle(.blue)
                            }
                        }

                        ForEach(store.transactions.prefix(3)) { transaction in
                            TransactionRow(transaction: transaction)
                        }
                    }

                    // Categories Summary
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Categories")
                                .font(.headline)

                            Spacer()

                            NavigationLink {
                                CategoriesView()
                            } label: {
                                Text("See All")
                                    .font(.subheadline)
                                    .foregroundStyle(.blue)
                            }
                        }

                        ForEach(store.categories.prefix(3)) { category in
                            CategoryRow(category: category)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Home")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
            .task {
                await store.fetchData()
            }
        }
    }
}

struct TransactionRow: View {
    let transaction: Transaction

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(transaction.description)
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Text(transaction.category)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text("$\(transaction.amount, specifier: "%.2f")")
                    .font(.subheadline)
                    .foregroundStyle(transaction.amount < 0 ? .red : .green)

                Text(transaction.date.formatted(date: .abbreviated, time: .omitted))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 8)
    }
}

struct CategoryRow: View {
    let category: Category

    var body: some View {
        HStack {
            Text(category.name)
                .font(.subheadline)
                .fontWeight(.semibold)

            Spacer()

            Text("$\(category.totalSpent, specifier: "%.2f")")
                .font(.subheadline)
                .foregroundStyle(.red)
        }
        .padding(.vertical, 8)
    }
}

struct TransactionsView: View {
    var body: some View {
        Text("Transactions View")
            .navigationTitle("Transactions")
    }
}

struct AddTransactionView: View {
    var body: some View {
        Text("Add Transaction View")
            .navigationTitle("Add Transaction")
    }
}

struct CategoriesView: View {
    var body: some View {
        Text("Categories View")
            .navigationTitle("Categories")
    }
}

struct SettingsView: View {
    var body: some View {
        Text("Settings View")
            .navigationTitle("Settings")
    }
}

#Preview {
    HomeView()
        .environment(AppStore())
}
```