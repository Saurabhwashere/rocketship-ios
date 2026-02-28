import Foundation
import SwiftUI

struct Habit: Identifiable, Codable, Hashable {
    let id: UUID
    var title: String
    var description: String
    var startDate: Date
    var streak: Int
    var completedDates: [Date]

    static let sampleData: [Habit] = [
        Habit(
            id: UUID(),
            title: "Morning Run",
            description: "Run 5 kilometers every morning",
            startDate: Date().addingTimeInterval(-86400 * 30),
            streak: 15,
            completedDates: (0..<15).map { Date().addingTimeInterval(-86400 * $0) }
        ),
        Habit(
            id: UUID(),
            title: "Read Book",
            description: "Read 30 pages of a book daily",
            startDate: Date().addingTimeInterval(-86400 * 60),
            streak: 30,
            completedDates: (0..<30).map { Date().addingTimeInterval(-86400 * $0) }
        ),
        Habit(
            id: UUID(),
            title: "Meditate",
            description: "Meditate for 10 minutes every evening",
            startDate: Date().addingTimeInterval(-86400 * 45),
            streak: 20,
            completedDates: (0..<20).map { Date().addingTimeInterval(-86400 * $0) }
        ),
        Habit(
            id: UUID(),
            title: "Drink Water",
            description: "Drink 2 liters of water daily",
            startDate: Date().addingTimeInterval(-86400 * 20),
            streak: 10,
            completedDates: (0..<10).map { Date().addingTimeInterval(-86400 * $0) }
        ),
        Habit(
            id: UUID(),
            title: "Learn Swift",
            description: "Spend 30 minutes learning Swift daily",
            startDate: Date().addingTimeInterval(-86400 * 10),
            streak: 5,
            completedDates: (0..<5).map { Date().addingTimeInterval(-86400 * $0) }
        )
    ]
}

@Observable
class AppStore {
    var habits: [Habit]

    init() {
        habits = Habit.sampleData
    }

    func addHabit(_ habit: Habit) {
        habits.append(habit)
    }

    func deleteHabit(_ habit: Habit) {
        habits.removeAll { $0.id == habit.id }
    }

    func updateHabit(_ habit: Habit) {
        if let index = habits.firstIndex(where: { $0.id == habit.id }) {
            habits[index] = habit
        }
    }
}

#Preview {
    Text("Models Preview")
        .environment(AppStore())
}