import Foundation
import SwiftUI

struct Habit: Identifiable, Codable, Hashable {
    let id: UUID
    var name: String
    var description: String
    var completionCount: Int
    var lastCompleted: Date

    static let sampleData: [Habit] = [
        Habit(id: UUID(), name: "Morning Exercise", description: "30 minutes of yoga or stretching", completionCount: 5, lastCompleted: Date().addingTimeInterval(-86400)),
        Habit(id: UUID(), name: "Read 20 Pages", description: "Read for at least 20 pages of a book", completionCount: 3, lastCompleted: Date().addingTimeInterval(-172800)),
        Habit(id: UUID(), name: "Drink Water", description: "Drink 8 glasses of water daily", completionCount: 7, lastCompleted: Date()),
        Habit(id: UUID(), name: "Meditate", description: "Meditate for 10 minutes", completionCount: 2, lastCompleted: Date().addingTimeInterval(-259200)),
        Habit(id: UUID(), name: "Learn Swift", description: "Spend 30 minutes learning Swift", completionCount: 4, lastCompleted: Date().addingTimeInterval(-432000))
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

    func incrementCompletionCount(for habit: Habit) {
        if let index = habits.firstIndex(where: { $0.id == habit.id }) {
            habits[index].completionCount += 1
            habits[index].lastCompleted = Date()
        }
    }
}

#Preview {
    Text("Models Preview")
        .environment(AppStore())
}