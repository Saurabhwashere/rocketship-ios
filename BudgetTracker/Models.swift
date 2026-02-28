```swift
import Foundation

struct Transaction: Identifiable, Codable {
    let id: UUID
    var amount: Double
    var category: String
    var date: Date
    var description: String

    static var sampleData: [Transaction] = [
        Transaction(id: UUID(), amount: 25.50, category: "Groceries", date: Date().addingTimeInterval(-86400), description: "Weekly grocery shopping"),
        Transaction(id: UUID(), amount: 12.99, category: "Dining Out", date: Date().addingTimeInterval(-172800), description: "Lunch with colleagues"),
        Transaction(id: UUID(), amount: 50.00, category: "Transportation", date: Date().addingTimeInterval(-259200), description: "Gas for the car"),
        Transaction(id: UUID(), amount: 35.75, category: "Entertainment", date: Date().addingTimeInterval(-345600), description: "Movie tickets"),
        Transaction(id: UUID(), amount: 100.00, category: "Utilities", date: Date().addingTimeInterval(-432000), description: "Electricity bill")
    ]
}

struct Category: Identifiable, Codable {
    let id: UUID
    var name: String
    var totalSpent: Double

    static var sampleData: [Category] = [
        Category(id: UUID(), name: "Groceries", totalSpent: 150.25),
        Category(id: UUID(), name: "Dining Out", totalSpent: 75.98),
        Category(id: UUID(), name: "Transportation", totalSpent: 200.00),
        Category(id: UUID(), name: "Entertainment", totalSpent: 120.50),
        Category(id: UUID(), name: "Utilities", totalSpent: 300.75)
    ]
}

@Observable
class AppStore {
    var transactions: [Transaction]
    var categories: [Category]

    init() {
        self.transactions = Transaction.sampleData
        self.categories = Category.sampleData
    }

    func addTransaction(_ transaction: Transaction) {
        transactions.append(transaction)
        updateCategoryTotal(for: transaction.category, amount: transaction.amount)
    }

    func deleteTransaction(_ transaction: Transaction) {
        if let index = transactions.firstIndex(where: { $0.id == transaction.id }) {
            transactions.remove(at: index)
            updateCategoryTotal(for: transaction.category, amount: -transaction.amount)
        }
    }

    func updateTransaction(_ transaction: Transaction) {
        if let index = transactions.firstIndex(where: { $0.id == transaction.id }) {
            let oldTransaction = transactions[index]
            transactions[index] = transaction
            updateCategoryTotal(for: oldTransaction.category, amount: -oldTransaction.amount)
            updateCategoryTotal(for: transaction.category, amount: transaction.amount)
        }
    }

    func addCategory(_ category: Category) {
        categories.append(category)
    }

    func deleteCategory(_ category: Category) {
        if let index = categories.firstIndex(where: { $0.id == category.id }) {
            categories.remove(at: index)
        }
    }

    func updateCategory(_ category: Category) {
        if let index = categories.firstIndex(where: { $0.id == category.id }) {
            categories[index] = category
        }
    }

    private func updateCategoryTotal(for categoryName: String, amount: Double) {
        if let index = categories.firstIndex(where: { $0.name == categoryName }) {
            categories[index].totalSpent += amount
        }
    }
}

#Preview {
    Text("Models Preview")
        .environment(AppStore())
}
```