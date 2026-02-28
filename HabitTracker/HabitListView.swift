import Foundation
import SwiftUI

struct HabitListView: View {
    @Environment(AppStore.self) var store

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.habits) { habit in
                    NavigationLink {
                        HabitDetailView(habit: habit)
                    } label: {
                        VStack(alignment: .leading) {
                            Text(habit.name)
                                .font(.headline)
                            Text(habit.description)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            HStack {
                                Label("\(habit.streak)", systemImage: "flame.fill")
                                Spacer()
                                Label("\(habit.completedDates.count)", systemImage: "checkmark.circle.fill")
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        }
                    }
                }
                .onDelete { indices in
                    store.deleteHabits(at: indices)
                }
            }
            .navigationTitle("Habits")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        AddHabitView()
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .task {
                await store.loadHabits()
            }
        }
    }
}

#Preview {
    HabitListView()
        .environment(AppStore())
}