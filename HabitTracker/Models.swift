```swift
import Foundation

struct Habit: Identifiable, Codable {
    let id: UUID
    var title: String
    var description: String
    var startDate: Date
    var streak: Int
    var completedDates: [Date]

    static var sampleData: [Habit] = [
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
            startDate: Date().addingTimeInterval(-86400 * 15),
            streak: 8,
            completedDates: (0..<8).map { Date().addingTimeInterval(-86400 * $0) }
        ),
        Habit(
            id: UUID(),
            title: "Drink Water",
            description: "Drink 2 liters of water daily",
            startDate: Date().addingTimeInterval(-86400 * 10),
            streak: 5,
            completedDates: (0..<5).map { Date().addingTimeInterval(-86400 * $0) }
        ),
        Habit(
            id: UUID(),
            title: "Meditate",
            description: "Meditate for 10 minutes every evening",
            startDate: Date().addingTimeInterval(-86400 * 5),
            streak: 3,
            completedDates: (0..<3).map { Date().addingTimeInterval(-86400 * $0) }
        ),
        Habit(
            id: UUID(),
            title: "Learn Swift",
            description: "Spend 30 minutes learning Swift daily",
            startDate: Date().addingTimeInterval(-86400 * 2),
            streak: 1,
            completedDates: [Date().addingTimeInterval(-86400)]
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

    func completeHabit(_ habit: Habit) {
        if let index = habits.firstIndex(where: { $0.id == habit.id }) {
            var updatedHabit = habit
            updatedHabit.completedDates.append(Date())
            updatedHabit.streak += 1
            habits[index] = updatedHabit
        }
    }
}

#Preview {
    Text("Models Preview")
        .environment(AppStore())
}
```