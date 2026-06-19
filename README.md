# Resume - LaTeX Setup Guide

## Prerequisites

To compile `resume.tex` into a PDF on macOS, you need the following installed.

### 1. Homebrew

If you don't have Homebrew installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. BasicTeX (LaTeX Distribution)

Install the lightweight TeX distribution via Homebrew:

```bash
brew install --cask basictex
```

After installation, add TeX binaries to your PATH (restart terminal or run):

```bash
export PATH="/Library/TeX/texbin:$PATH"
```

### 3. Required LaTeX Packages

Install the additional LaTeX packages using `tlmgr` (TeX Live Manager):

```bash
sudo tlmgr update --self
sudo tlmgr install fontspec fontawesome5 biblatex biber parskip hologo titlesec enumitem supertabular multirow xcolor geometry hyperref ulem
```

### 4. Arial Font

The resume uses **Arial** as the main font (`\setmainfont{Arial}`). This font is pre-installed on macOS. If you're on Linux, install the Microsoft core fonts or change the font in the `.tex` file.

## Compiling to PDF

This resume uses `fontspec` and custom fonts, so it must be compiled with **XeLaTeX** (not pdflatex):

```bash
xelatex resume.tex
```

Run it twice if you see warnings about references or outlines:

```bash
xelatex resume.tex
xelatex resume.tex
```

The output will be `resume.pdf` in the same directory.

## Summary of Installed Packages

| Package | Purpose |
|---------|---------|
| `basictex` | Core LaTeX distribution (includes XeLaTeX) |
| `fontspec` | Custom font support (requires XeLaTeX) |
| `fontawesome5` | Icons (GitHub, LinkedIn, email, phone) |
| `biblatex` + `biber` | Bibliography management |
| `parskip` | Paragraph spacing |
| `hologo` | TeX logo rendering |
| `titlesec` | Custom section formatting |
| `enumitem` | Custom list formatting |
| `supertabular` | Tables spanning multiple pages |
| `multirow` | Multi-row table cells |
| `xcolor` | Color support |
| `geometry` | Page margin control |
| `hyperref` | Clickable hyperlinks |
| `ulem` | Underline styling |

## Troubleshooting

- **"Font not found" error**: Make sure Arial is installed on your system, or change `\setmainfont{Arial}` to another available font.
- **"Package not found" error**: Run `sudo tlmgr install <package-name>` for the missing package.
- **`tlmgr` not found**: Ensure `/Library/TeX/texbin` is in your PATH.
