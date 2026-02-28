import Foundation
import SwiftUI

@main
struct HabitTrackerApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                HabitListView()
            }
            .environment(AppStore())
        }
    }
}

#Preview {
    HabitListView().environment(AppStore())
}