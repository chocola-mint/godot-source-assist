// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as ClassDB from './ClassDB';
import HeaderCodeLensProvider from './HeaderCodeLensProvider';
import SourceCodeLensProvider from './SourceCodeLensProvider';
import * as fs from 'fs';
import path from 'path';

function checkIfWorkspaceIsGodotEngine() : Boolean {
	if (vscode.workspace.workspaceFolders) {
		for (const folder of vscode.workspace.workspaceFolders) {
			const exists = fs.existsSync(path.join(folder.uri.fsPath, "/core/object/class_db.h"));
			if (exists) {
				return true;
			}
		}
	}
	return false;
}

function checkIfWorkspaceIsGodotCpp() : Boolean {
	if (vscode.workspace.workspaceFolders) {
		for (const folder of vscode.workspace.workspaceFolders) {
			const exists = fs.existsSync(path.join(folder.uri.fsPath, "/godot-cpp/include/godot-cpp/core/class_db.hpp"));
			if (exists) {
				return true;
			}
		}
	}
	return false;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	if (!vscode.workspace.getConfiguration("godotSourceAssist.alwaysEnabled")) {
		if (checkIfWorkspaceIsGodotEngine()) {
			vscode.window.showInformationMessage("Detected Godot Engine codebase");
		} else if (checkIfWorkspaceIsGodotCpp()) {
			vscode.window.showInformationMessage("Detected GDExtension project using godot-cpp");
		} else {
			console.log("Current workspace is not a Godot C++ codebase.");
			return;
		}
	}

	ClassDB.activate(context);
	context.subscriptions.push(vscode.languages.registerCodeLensProvider({
		"language": "cpp",
		"scheme": "file",
		"pattern": "**/*.cpp",
	}, new SourceCodeLensProvider));
	context.subscriptions.push(vscode.languages.registerCodeLensProvider({
		"language": "cpp",
		"scheme": "file",
		"pattern": "**/*.h",
	}, new HeaderCodeLensProvider));
}

// This method is called when your extension is deactivated
export function deactivate() {
	ClassDB.deactivate();
}
