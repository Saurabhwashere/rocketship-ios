```swift
import SwiftUI

struct SettingsView: View {
    @Environment(AppStore.self) var store

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        CategoriesView()
                    } label: {
                        Label("Categories", systemImage: "list.bullet")
                    }

                    NavigationLink {
                        Text("Account Settings")
                    } label: {
                        Label("Account", systemImage: "person.crop.circle")
                    }

                    NavigationLink {
                        Text("Notifications")
                    } label: {
                        Label("Notifications", systemImage: "bell")
                    }
                }

                Section {
                    NavigationLink {
                        Text("About")
                    } label: {
                        Label("About", systemImage: "info.circle")
                    }

                    NavigationLink {
                        Text("Help & Feedback")
                    } label: {
                        Label("Help", systemImage: "questionmark.circle")
                    }
                }

                Section {
                    Button(role: .destructive) {
                        // Handle sign out
                    } label: {
                        Label("Sign Out", systemImage: "arrow.left.square")
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        // Handle done action
                    } label: {
                        Text("Done")
                    }
                }
            }
        }
    }
}

#Preview {
    SettingsView()
        .environment(AppStore())
}
```