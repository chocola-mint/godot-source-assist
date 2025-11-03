# Godot Source Assist

Godot Source Assist is a Visual Studio Code extension that provides various IntelliSense support to make working with the Godot source and C++ GDExtension projects much easier.

## Features

- Code Lens support: Identify which functions are registered to ClassDB, and quickly jump to the corresponding line in `_bind_methods()`.
  - If the function is linked as a property's getter or setter, you can also jump to the property's definition instead.

## Extension Settings

* `godotSourceAssist.alwaysEnabled`: Godot Source Assist will automatically turn itself off if a non-Godot codebase is detected. Setting this to true disables this behavior.
