
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
