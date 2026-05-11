#!/bin/bash
echo "🚀 Syncing your updates globally..."

cd ~/.gemini/antigravity/scratch/alumni-interactive-site
git add .
git commit -m "Automated dashboard sync"
git push origin main

echo "✅ Deployment pushed! Devices will update in ~30 seconds."
