import Foundation

struct Habit: Identifiable, Codable {
    let id: UUID
    var name: String
    var description: String
    var startDate: Date
    var streak: Int
    var completedDates: [Date]

    static var sampleData: [Habit] = [
        Habit(
            id: UUID(),
            name: "Morning Run",
            description: "Run 5 kilometers every morning",
            startDate: Calendar.current.date(byAdding: .day, value: -30, to: Date())!,
            streak: 15,
            completedDates: (0..<15).map { Calendar.current.date(byAdding: .day, value: -$0, to: Date())! }
        ),
        Habit(
            id: UUID(),
            name: "Read a Book",
            description: "Read at least 20 pages daily",
            startDate: Calendar.current.date(byAdding: .day, value: -15, to: Date())!,
            streak: 8,
            completedDates: (0..<8).map { Calendar.current.date(byAdding: .day, value: -$0, to: Date())! }
        ),
        Habit(
            id: UUID(),
            name: "Drink Water",
            description: "Drink 2 liters of water daily",
            startDate: Calendar.current.date(byAdding: .day, value: -10, to: Date())!,
            streak: 5,
            completedDates: (0..<5).map { Calendar.current.date(byAdding: .day, value: -$0, to: Date())! }
        ),
        Habit(
            id: UUID(),
            name: "Meditate",
            description: "Meditate for 10 minutes daily",
            startDate: Calendar.current.date(byAdding: .day, value: -5, to: Date())!,
            streak: 3,
            completedDates: (0..<3).map { Calendar.current.date(byAdding: .day, value: -$0, to: Date())! }
        )
    ]
}

@Observable
class AppStore {
    var habits: [Habit]

    init() {
        habits = Habit.sampleData
    }

    func addHabit(name: String, description: String, startDate: Date) {
        let newHabit = Habit(
            id: UUID(),
            name: name,
            description: description,
            startDate: startDate,
            streak: 0,
            completedDates: []
        )
        habits.append(newHabit)
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
        var updatedHabit = habit
        let today = Calendar.current.startOfDay(for: Date())

        if !updatedHabit.completedDates.contains(today) {
            updatedHabit.completedDates.append(today)
            updatedHabit.streak += 1
            updateHabit(updatedHabit)
        }
    }
}

#Preview {
    Text("Models Preview")
        .environment(AppStore())
}