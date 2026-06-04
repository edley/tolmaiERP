"use client";

import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  User,
  Settings,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Palette,
  Bell,
  Moon,
  Sun,
  Monitor,
  ListTodo,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useState } from "react";
import { Modal } from "../Modal";
import { TaskManager } from "./task-manager";
import { Waitlist } from "./waitlist";
import { HelpModal } from "./help-button";
import { AvatarUpload } from "./avatar-upload";

interface AccountMenuProps {
  userName: string;
  userEmail?: string;
  userId?: string;
  userAvatarUrl?: string | null;
}

export function AccountMenu({ userName, userEmail, userId, userAvatarUrl }: AccountMenuProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [tasksOpen, setTasksOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userAvatarUrl ?? null);
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 h-auto shadow-none"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="h-6 w-6 rounded-full bg-[#0070d2] text-white text-[10px] font-bold flex items-center justify-center">
              {initials}
            </span>
          )}
          <span className="text-sm hidden sm:inline">{userName}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 rounded-xl border border-slate-200 bg-white shadow-md p-2">
        {userEmail && (
          <>
            <div className="px-2 py-1.5">
              <div className="text-sm font-semibold text-slate-800 truncate">{userName}</div>
              <div className="text-xs text-slate-500 truncate">{userEmail}</div>
            </div>
            <DropdownMenuSeparator className="my-1" />
          </>
        )}

        <DropdownMenuLabel className="text-xs text-slate-500 font-medium px-2">
          Account
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="flex items-center gap-2 rounded-lg py-2 px-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          <span className="flex-1 text-sm">Home</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2 rounded-lg py-2 px-2 cursor-pointer"
          onClick={() => navigate("/settings")}
        >
          <Settings className="w-4 h-4 text-slate-500" />
          <span className="flex-1 text-sm">Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuLabel className="text-xs text-slate-500 font-medium px-2">
          Preferences
        </DropdownMenuLabel>

        <DropdownMenuItem
          className="flex items-center gap-2 rounded-lg py-2 px-2 cursor-pointer"
          onClick={() => setAvatarOpen(true)}
        >
          <User className="w-4 h-4 text-slate-500" />
          <span className="flex-1 text-sm">Change Avatar</span>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2 rounded-lg py-2 px-2 cursor-pointer">
            <Palette className="w-4 h-4 text-slate-500" />
            <span className="flex-1 text-sm">Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-44 rounded-lg border border-slate-200 bg-white shadow-sm p-1">
              <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'night' | 'system')}>
                <DropdownMenuRadioItem value="light" className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm">
                  <Sun className="w-4 h-4" />
                  <span className="flex-1">Light</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm">
                  <Moon className="w-4 h-4" />
                  <span className="flex-1">Dark</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="night" className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm">
                  <Moon className="w-4 h-4" />
                  <span className="flex-1">Night</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm">
                  <Monitor className="w-4 h-4" />
                  <span className="flex-1">System</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuItem
          className="flex items-center gap-2 rounded-lg py-2 px-2 cursor-pointer"
          onClick={() => setTasksOpen(true)}
        >
          <ListTodo className="w-4 h-4 text-slate-500" />
          <span className="flex-1 text-sm">My Tasks</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center gap-2 rounded-lg py-2 px-2 cursor-pointer"
          onClick={() => setWaitlistOpen(true)}
        >
          <Sparkles className="w-4 h-4 text-slate-500" />
          <span className="flex-1 text-sm">Join Waitlist</span>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2 rounded-lg py-2 px-2 cursor-pointer">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="flex-1 text-sm">Notifications</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-44 rounded-lg border border-slate-200 bg-white shadow-sm p-1">
              <DropdownMenuCheckboxItem className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm">
                <Bell className="w-4 h-4" />
                <span className="flex-1">Email Alerts</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm">
                <Bell className="w-4 h-4" />
                <span className="flex-1">Push Notifications</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm">
                <Bell className="w-4 h-4" />
                <span className="flex-1">SMS Alerts</span>
              </DropdownMenuCheckboxItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuLabel className="text-xs text-slate-500 font-medium px-2">
          Support
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="flex items-center gap-2 rounded-lg py-2 px-2 cursor-pointer"
          onClick={() => setHelpOpen(true)}
        >
          <HelpCircle className="w-4 h-4 text-slate-500" />
          <span className="flex-1 text-sm">Help & Support</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuLabel className="text-xs text-slate-500 font-medium px-2">
          Actions
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="flex items-center gap-2 py-2 px-2 rounded cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          <span className="flex-1 text-sm">Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      <TaskManager open={tasksOpen} onClose={() => setTasksOpen(false)} />

      <Modal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} title="Waitlist">
        <Waitlist onClose={() => setWaitlistOpen(false)} />
      </Modal>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <Modal open={avatarOpen} onClose={() => setAvatarOpen(false)} title="Change Avatar" companyName={userName}>
        {userId && (
          <AvatarUpload
            userId={userId}
            currentUrl={avatarUrl}
            userName={userName}
            onUpdate={(url) => { setAvatarUrl(url); setAvatarOpen(false) }}
          />
        )}
      </Modal>
    </DropdownMenu>
  );
}
