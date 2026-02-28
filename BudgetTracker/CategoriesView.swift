```swift
import SwiftUI

struct CategoriesView: View {
    @Environment(AppStore.self) var store

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.categories, id: \.name) { category in
                    NavigationLink(value: category) {
                        HStack {
                            Text(category.name)
                                .font(.headline)
                            Spacer()
                            Text("$\(category.totalSpent, specifier: "%.2f")")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Categories")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(value: "addTransaction") {
                        Image(systemName: "plus")
                    }
                }
            }
            .navigationDestination(for: Category.self) { category in
                TransactionsView(category: category)
            }
            .navigationDestination(for: String.self) { route in
                if route == "addTransaction" {
                    AddTransactionView()
                }
            }
            .task {
                await store.fetchCategories()
            }
        }
    }
}

#Preview {
    CategoriesView()
        .environment(AppStore())
}
```