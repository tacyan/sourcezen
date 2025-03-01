
# GitHub Repository Explorer

## Overview

This application allows you to explore GitHub repositories, view their file structure, and examine the contents of individual files. It fetches repository data using the GitHub API and presents it in a user-friendly interface.

## Features

- **Repository Browsing**: Enter any public GitHub repository URL to explore its file structure
- **File Tree Navigation**: Browse through the repository's directory structure with an interactive file tree
- **File Content Viewing**: View the contents of individual files with syntax highlighting
- **Markdown Rendering**: View markdown files with proper formatting
- **File Filtering**: Exclude files and directories using customizable ignore patterns (similar to .gitignore)
- **Dark Mode**: Toggle between light and dark themes for comfortable viewing
- **Export Options**: Copy file contents to clipboard or download as markdown

## Ignore Patterns

The application comes with default ignore patterns to filter out common files and directories that aren't typically needed for code review:

- node_modules
- .git
- package-lock.json
- And many other common configuration and documentation files

You can customize these patterns to suit your needs when exploring repositories.

## Technologies Used

- React
- TypeScript
- Tailwind CSS
- shadcn/ui components
- GitHub API integration

## Setting up the GitHub Token

To increase the GitHub API rate limit, you can set up a personal access token:

1. Create a personal access token on GitHub:
   - Go to Settings > Developer settings > Personal access tokens
   - Generate a new token with the `repo` and `read:user` scopes
   - Copy the generated token

2. Set the token as an environment variable:
   - Create a `.env` file in the root directory
   - Add the following line: `VITE_GITHUB_TOKEN=your_token_here`

Alternatively, you can set the environment variable directly when running the app:
```sh
VITE_GITHUB_TOKEN=your_token_here npm run dev
```

## How to Use

1. Enter a GitHub repository URL in the input field
2. Set the maximum depth for directory traversal (optional)
3. Customize ignore patterns if needed
4. Click "Fetch Repository" to load the repository structure
5. Navigate through the file tree on the left panel
6. View file contents on the right panel
7. Use the buttons at the top of the file content panel to copy or download the file

## Project Structure

This project is built with Vite, TypeScript, React, shadcn-ui, and Tailwind CSS. It includes:

- Components for file tree navigation and display
- GitHub API integration for fetching repository data
- Markdown rendering with syntax highlighting
- Dark mode support
- Responsive design for various screen sizes

## Getting Started

To run this project locally:

```sh
# Clone the repository
git clone <REPOSITORY_URL>

# Navigate to the project directory
cd <PROJECT_DIRECTORY>

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests to improve the functionality or fix bugs.

---

# GitHub リポジトリエクスプローラー

## 概要

このアプリケーションは、GitHubリポジトリを探索し、ファイル構造を表示し、個々のファイルの内容を調べることができます。GitHub APIを使用してリポジトリデータを取得し、ユーザーフレンドリーなインターフェースで表示します。

## 機能

- **リポジトリブラウジング**: 任意の公開GitHubリポジトリURLを入力してファイル構造を探索
- **ファイルツリーナビゲーション**: インタラクティブなファイルツリーでリポジトリのディレクトリ構造を閲覧
- **ファイル内容表示**: 個々のファイルの内容を構文ハイライト付きで表示
- **マークダウンレンダリング**: マークダウンファイルを適切な書式で表示
- **ファイルフィルタリング**: カスタマイズ可能な無視パターン（.gitignoreと同様）を使用してファイルとディレクトリを除外
- **ダークモード**: 快適な表示のためにライトテーマとダークテーマを切り替え
- **エクスポートオプション**: ファイル内容をクリップボードにコピーしたり、マークダウンとしてダウンロード

## 無視パターン

このアプリケーションには、コードレビューに通常必要ないような一般的なファイルとディレクトリをフィルタリングするためのデフォルトの無視パターンが付属しています：

- node_modules
- .git
- package-lock.json
- その他多くの一般的な設定およびドキュメントファイル

リポジトリを探索する際に、これらのパターンを必要に応じてカスタマイズできます。

## 使用技術

- React
- TypeScript
- Tailwind CSS
- shadcn/uiコンポーネント
- GitHub API連携

## GitHub トークンの設定

GitHub APIのレート制限を増やすために、個人アクセストークンを設定できます：

1. GitHubで個人アクセストークンを作成：
   - Settings > Developer settings > Personal access tokens（設定 > 開発者設定 > 個人アクセストークン）に移動
   - `repo`と`read:user`スコープを持つ新しいトークンを生成
   - 生成されたトークンをコピー

2. トークンを環境変数として設定：
   - ルートディレクトリに`.env`ファイルを作成
   - 次の行を追加：`VITE_GITHUB_TOKEN=あなたのトークン`

または、アプリを実行するときに直接環境変数を設定することもできます：
```sh
VITE_GITHUB_TOKEN=あなたのトークン npm run dev
```

## 使用方法

1. 入力フィールドにGitHubリポジトリURLを入力
2. ディレクトリ探索の最大深度を設定（オプション）
3. 必要に応じて無視パターンをカスタマイズ
4. 「ドキュメント生成」をクリックしてリポジトリ構造を読み込み
5. 左パネルでファイルツリーをナビゲート
6. 右パネルでファイル内容を表示
7. ファイル内容パネルの上部にあるボタンを使用してコピーまたはダウンロード

## プロジェクト構造

このプロジェクトは、Vite、TypeScript、React、shadcn-ui、およびTailwind CSSで構築されています。以下を含みます：

- ファイルツリーナビゲーションと表示のためのコンポーネント
- リポジトリデータを取得するためのGitHub API統合
- 構文ハイライト付きのマークダウンレンダリング
- ダークモードサポート
- 様々な画面サイズに対応したレスポンシブデザイン

## ローカルでの実行方法

このプロジェクトをローカルで実行するには：

```sh
# リポジトリをクローン
git clone <リポジトリURL>

# プロジェクトディレクトリに移動
cd <プロジェクトディレクトリ>

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

## 貢献

貢献歓迎します！機能改善やバグ修正のために、issueやプルリクエストを提出してください。
