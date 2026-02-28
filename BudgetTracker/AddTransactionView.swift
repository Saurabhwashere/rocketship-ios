```swift
import SwiftUI

struct AddTransactionView: View {
    @Environment(AppStore.self) var store
    @State private var amount: String = ""
    @State private var category: String = ""
    @State private var date: Date = Date()
    @State private var description: String = ""

    var body: some View {
        Form {
            Section {
                TextField("Amount", text: $amount)
                    .keyboardType(.decimalPad)
                Picker("Category", selection: $category) {
                    ForEach(store.categories, id: \.name) { category in
                        Text(category.name).tag(category.name)
                    }
                }
                DatePicker("Date", selection: $date, displayedComponents: .date)
                TextField("Description", text: $description)
            }

            Section {
                Button("Save") {
                    saveTransaction()
                }
                .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .navigationTitle("Add Transaction")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button(action: {
                    dismiss()
                }) {
                    Image(systemName: "xmark")
                }
            }
        }
    }

    private func saveTransaction() {
        guard let amountValue = Double(amount) else { return }

        let transaction = Transaction(
            id: UUID(),
            amount: amountValue,
            category: category,
            date: date,
            description: description
        )

        store.addTransaction(transaction)
        dismiss()
    }

    private func dismiss() {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            window.rootViewController?.dismiss(animated: true)
        }
    }
}

#Preview {
    NavigationStack {
        AddTransactionView()
            .environment(AppStore())
    }
}
```