import SwiftUI

@main
struct BudgetTrackerApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                HomeView()
            }
        }
    }
}

#Preview {
    HomeView()
}