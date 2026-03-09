This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## General Guidelines

- Use bun for all package management, all scripts and commands.
- Follow the established code style and patterns in the codebase.
- Write clear, descriptive commit messages and PR descriptions.
- Use gh CLI as much as possible for all GitHub interactions, including PR creation and management.
- Avoid using `gh` or `git` commands for specific file operations; instead, use the appropriate bun scripts or manual file edits as needed. For example, avoid using `git add <file>` and instead always use `git add .` to ensure all changes are staged properly without hitting permission issues. When prompted to work on an issue, you should use `gh issue view <issue-number>` to read the issue details, `gh issue develop <issue-number> -c` to start working on the issue, and then `gh pr create` to create a pull request, ensuring that all changes are included and properly documented in the PR description.
- When in doubt, ask for clarification or guidance from the team but always try to find the answer in the documentation or codebase first. This shows initiative and helps you learn the codebase better.
- Whenever you discover new information about the codebase, architecture, or best practices, document it in this file under the `Findings & Recommendations` section. This will help future agents and developers understand the context and make informed decisions.

## QUALITY EXPECTATIONS

This codebase will outlive you. Every shortcut you take becomes
someone else's burden. Every hack compounds into technical debt
that slows the whole team down.

You are not just writing code. You are shaping the future of this
project. The patterns you establish will be copied. The corners
you cut will be cut again.

Fight entropy. Leave the codebase better than you found it.

## Skills

- When working on React code, apply the `vercel-react-best-practices` agent skill (performance + best practices) and call out any rule you’re following when making non-obvious changes.
- When working on auth code, apply the `better-auth-best-practices` agent skill (security + best practices) and call out any rule you’re following when making non-obvious changes.
- When working on database code, apply the `supabase-postgres-best-practices` agent skill (performance + best practices) and call out any rule you’re following when making non-obvious changes.
