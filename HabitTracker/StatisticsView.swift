import Foundation
import SwiftUI

struct StatisticsView: View {
    @Environment(AppStore.self) var store

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    StatisticsCard(title: "Total Habits", value: "\(store.habits.count)", icon: "list.bullet")
                    StatisticsCard(title: "Total Completions", value: "\(store.habits.reduce(0) { $0 + $1.completionCount })", icon: "checkmark.circle.fill")

                    if let mostCompletedHabit = store.habits.max(by: { $0.completionCount < $1.completionCount }) {
                        StatisticsCard(title: "Most Completed", value: mostCompletedHabit.name, icon: "star.fill")
                    }

                    if let lastCompletedHabit = store.habits.max(by: { $0.lastCompleted ?? .distantPast < $1.lastCompleted ?? .distantPast }) {
                        StatisticsCard(title: "Last Completed", value: lastCompletedHabit.name, icon: "clock.fill")
                    }
                }
                .padding()
            }
            .navigationTitle("Statistics")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: {
                        store.refreshStatistics()
                    }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .task {
                await store.loadHabits()
            }
        }
    }
}

struct StatisticsCard: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(.blue)
                Text(title)
                    .font(.headline)
            }

            Text(value)
                .font(.largeTitle)
                .fontWeight(.bold)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
    }
}

#Preview {
    StatisticsView()
        .environment(AppStore())
}