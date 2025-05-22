"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/utils/supabase-client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface EditDisplayNameModalProps {
  user: User | null
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSuccess: (newDisplayName: string) => void
}

export default function EditDisplayNameModal({
  user,
  isOpen,
  onOpenChange,
  onSuccess,
}: EditDisplayNameModalProps) {
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (user?.user_metadata?.display_name) {
      setDisplayName(user.user_metadata.display_name)
    } else {
      setDisplayName("")
    }
  }, [user, isOpen])

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your display name.",
        variant: "destructive",
      })
      return
    }
    if (!displayName.trim()) {
      toast({
        title: "Error",
        description: "Display name cannot be empty.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() },
    })
    setIsLoading(false)

    if (error) {
      toast({
        title: "Error updating display name",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success!",
        description: "Your display name has been updated.",
      })
      if (data.user?.user_metadata?.display_name) {
        onSuccess(data.user.user_metadata.display_name)
      } else {
        onSuccess(displayName.trim()) // Fallback, should ideally come from data.user
      }
      onOpenChange(false) // Close modal
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white border-2 border-black shadow-pop">
        <DialogHeader>
          <DialogTitle className="font-bangers text-2xl text-pop-blue">Edit Display Name</DialogTitle>
          <DialogDescription>
            Make changes to your display name here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="displayName" className="text-right text-black">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="col-span-3 border-black focus:border-pop-orange"
              placeholder="Your Display Name"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-black text-black hover:bg-gray-200">Cancel</Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleSave} 
            disabled={isLoading}
            className="bg-pop-green hover:bg-pop-green-dark text-white font-bold border-2 border-black rounded-lg"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
