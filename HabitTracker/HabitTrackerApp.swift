import Foundation
import SwiftUI

@main
struct HabitTrackerApp: App {
    var body: some Scene {
        WindowGroup {
            TabView {
                HabitListView()
                    .tabItem { Label("HabitList", systemImage: "circle") }
                HabitDetailView()
                    .tabItem { Label("HabitDetail", systemImage: "circle") }
                AddHabitView()
                    .tabItem { Label("AddHabit", systemImage: "circle") }
                StatisticsView()
                    .tabItem { Label("Statistics", systemImage: "circle") }
            }
        }
    }
}

#Preview {
    HabitListView()
}