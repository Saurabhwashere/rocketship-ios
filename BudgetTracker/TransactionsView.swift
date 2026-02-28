```swift
import SwiftUI

struct TransactionsView: View {
    @Environment(AppStore.self) var store
    @State private var searchText = ""
    @State private var selectedCategory: String? = nil

    var filteredTransactions: [Transaction] {
        store.transactions.filter { transaction in
            (searchText.isEmpty || transaction.description.localizedCaseInsensitiveContains(searchText)) &&
            (selectedCategory == nil || transaction.category == selectedCategory)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(filteredTransactions) { transaction in
                    TransactionRow(transaction: transaction)
                }
            }
            .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always))
            .overlay {
                if filteredTransactions.isEmpty {
                    ContentUnavailableView.search
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Picker("Category", selection: $selectedCategory) {
                            Text("All Categories").tag(nil as String?)
                            ForEach(store.categories, id: \.name) { category in
                                Text(category.name).tag(category.name as String?)
                            }
                        }
                    } label: {
                        Label("Filter", systemImage: "line.3.horizontal.decrease.circle")
                    }
                }
            }
            .navigationTitle("Transactions")
            .navigationDestination(for: Transaction.self) { transaction in
                AddTransactionView(transaction: transaction)
            }
            .task {
                await store.fetchTransactions()
            }
        }
    }
}

struct TransactionRow: View {
    let transaction: Transaction

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(transaction.description)
                    .font(.headline)
                Text(transaction.category)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing) {
                Text(transaction.amount, format: .currency(code: "USD"))
                    .font(.headline)
                    .foregroundStyle(transaction.amount < 0 ? .red : .green)
                Text(transaction.date, format: .dateTime.day().month().year())
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    TransactionsView()
        .environment(AppStore())
}
```