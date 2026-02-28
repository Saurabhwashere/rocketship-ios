import SwiftUI

@main
struct HabitTrackerApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                HabitListView()
            }
        }
    }
}

#Preview {
    HabitListView()
}