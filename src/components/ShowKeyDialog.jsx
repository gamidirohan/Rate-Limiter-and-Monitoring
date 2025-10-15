"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, CheckCheck, AlertTriangle } from 'lucide-react'

export function ShowKeyDialog({ apiKey, open, onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Save Your API Key
          </DialogTitle>
          <DialogDescription className="text-base">
            This is the only time you&apos;ll see this API key. Make sure to copy it and store it securely.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                value={apiKey}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCheck className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              <strong>Important:</strong> For security reasons, we cannot show you this key again. 
              If you lose it, you&apos;ll need to generate a new one.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">
            I&apos;ve Saved My Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
