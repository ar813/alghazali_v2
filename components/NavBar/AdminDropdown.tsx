import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, LayoutDashboard, Smartphone, UserCog, ShieldCheck, User } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import LogoutConfirmationDialog from "../Auth/LogoutConfirmationDialog";
import ProfileUpdateDialog from "../Auth/ProfileUpdateDialog";

interface AdminDropdownProps {
    user: FirebaseUser;
    role?: "admin" | "super_admin" | null;
    logout: () => Promise<void>;
}

export function AdminDropdown({ user, role, logout }: AdminDropdownProps) {
    const router = useRouter();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showProfileUpdate, setShowProfileUpdate] = useState(false);

    const handleLogout = async () => {
        await logout();
        router.refresh();
    };

    const initials = user.displayName
        ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
        : "AD";

    const mobileAppUrl = process.env.NEXT_PUBLIC_MOBILE_APP_URL || "#";

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button className="relative outline-none group">
                        <div className={cn(
                            "h-10 w-10 flex items-center justify-center overflow-hidden transition-all duration-300",
                            "bg-white border border-gray-100 group-hover:border-emerald-800/30",
                            "shadow-sm group-hover:shadow-md"
                        )}>
                            {user.photoURL ? (
                                <Image
                                    src={user.photoURL}
                                    alt="Profile"
                                    width={40}
                                    height={40}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <span className="text-[10px] font-black text-emerald-800 label-mono">
                                    {initials}
                                </span>
                            )}
                        </div>
                        {/* Status Indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-white p-0.5">
                            <div className="w-full h-full bg-emerald-500 rounded-full border border-white" />
                        </div>
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent 
                    className="w-64 p-0 bg-white border border-gray-100 shadow-2xl rounded-none animate-in fade-in zoom-in-95 duration-200" 
                    align="end" 
                    sideOffset={12}
                >
                    {/* Premium Header */}
                    <div className="p-5 bg-gray-50/50 border-b border-gray-100">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 shrink-0 bg-white flex items-center justify-center text-emerald-800 font-black text-xs border border-gray-100 shadow-sm label-mono">
                                {user.photoURL ? (
                                    <Image src={user.photoURL} alt="" width={48} height={48} className="object-cover" />
                                ) : initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold truncate text-gray-900 tracking-tight">
                                    {user.displayName || "Admin User"}
                                </span>
                                <span className="text-[10px] text-gray-400 truncate font-medium mb-2">
                                    {user.email}
                                </span>
                            </div>
                        </div>
                        
                        <div className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border label-mono",
                            role === "super_admin"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                        )}>
                            <ShieldCheck size={10} />
                            {role === "super_admin" ? "Super Admin" : "Administrator"}
                        </div>
                    </div>

                    <div className="p-1.5">
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 cursor-pointer outline-none transition-colors hover:bg-gray-50 group">
                                    <LayoutDashboard size={16} className="text-gray-400 group-hover:text-emerald-800 transition-colors" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600 group-hover:text-gray-900">Dashboard</span>
                                </Link>
                            </DropdownMenuItem>
                            
                            {role === "super_admin" && (
                                <DropdownMenuItem asChild>
                                    <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2.5 cursor-pointer outline-none transition-colors hover:bg-gray-50 group">
                                        <UserCog size={16} className="text-gray-400 group-hover:text-emerald-800 transition-colors" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600 group-hover:text-gray-900">Manage Users</span>
                                    </Link>
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem asChild>
                                <Link href={mobileAppUrl} target="_blank" className="flex items-center gap-3 px-3 py-2.5 cursor-pointer outline-none transition-colors hover:bg-gray-50 group">
                                    <Smartphone size={16} className="text-gray-400 group-hover:text-emerald-800 transition-colors" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600 group-hover:text-gray-900">Mobile App</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <div className="my-1.5 h-px bg-gray-100 mx-2" />

                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                onClick={() => setShowProfileUpdate(true)}
                                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer outline-none transition-colors hover:bg-gray-50 group"
                            >
                                <User size={16} className="text-gray-400 group-hover:text-emerald-800 transition-colors" />
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 group-hover:text-gray-900">Edit Profile</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowLogoutConfirm(true);
                                }}
                                className="flex items-center gap-3 px-3 py-2.5 text-red-600 cursor-pointer outline-none transition-colors hover:bg-red-50 group"
                            >
                                <LogOut size={16} className="text-red-400 group-hover:text-red-600 transition-colors" />
                                <span className="text-xs font-black uppercase tracking-widest">Sign Out</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </div>

                    {/* Subtle Bottom Branding */}
                    <div className="p-3 bg-gray-50/30 text-center border-t border-gray-100">
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em] label-mono">
                            Al Ghazali Core v3.0
                        </p>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <ProfileUpdateDialog
                open={showProfileUpdate}
                onOpenChange={setShowProfileUpdate}
            />

            <LogoutConfirmationDialog
                open={showLogoutConfirm}
                onOpenChange={setShowLogoutConfirm}
                onConfirm={handleLogout}
            />
        </>
    );
}
