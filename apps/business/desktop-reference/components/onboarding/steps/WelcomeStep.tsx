import { Button } from "@/components/ui/button";
import type { BusinessProfileFormData, SuperUserFormData } from "../OnboardingFlow";
import {
  IconBuildingStore,
  IconChartBar,
  IconPackage,
  IconUsers,
  IconChevronRight,
  IconTruckDelivery,
  IconBriefcase,
} from "@tabler/icons-react";

interface WelcomeStepProps {
  onNext: () => void;
  onBack?: () => void;
  onFinish: () => void;
  isLastStep: boolean;
  isFirstStep?: boolean;
  superUserForm?: SuperUserFormData;
  setSuperUserForm?: (form: SuperUserFormData) => void;
  businessProfileForm?: BusinessProfileFormData;
  setBusinessProfileForm?: (form: BusinessProfileFormData) => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {

  return (
    <div className="flex flex-col h-full justify-between space-y-8">
      {/* Step Context / Value Proposition */}
      <div className="text-left">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
          Get Your Shop Operations Sorted
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          AkiliBiz helps you move away from manual tracking. We will set up your
          system with these essential tools to manage your stock, track your
          sales, and monitor cash flow effortlessly.
        </p>
      </div>

      {/* Value Proposition Grid (Using pure theme design tokens) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto">
        <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background dark:bg-[#121212] p-4 text-left hover:border-primary/50 transition-colors group">
          <div className="p-2.5 rounded-lg bg-muted dark:bg-neutral-800 text-primary transition-colors group-hover:bg-primary/10">
            <IconPackage className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Inventory</p>
            <p className="text-xs text-muted-foreground">
              Track stock levels & items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background dark:bg-[#121212] p-4 text-left hover:border-primary/50 transition-colors group">
          <div className="p-2.5 rounded-lg bg-muted dark:bg-neutral-800 text-primary transition-colors group-hover:bg-primary/10">
            <IconUsers className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Customers</p>
            <p className="text-xs text-muted-foreground">
              Manage relationships & CRM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background dark:bg-[#121212] p-4 text-left hover:border-primary/50 transition-colors group">
          <div className="p-2.5 rounded-lg bg-muted dark:bg-neutral-800 text-primary transition-colors group-hover:bg-primary/10">
            <IconChartBar className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Reports</p>
            <p className="text-xs text-muted-foreground">
              Business insights & analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background dark:bg-[#121212] p-4 text-left hover:border-primary/50 transition-colors group">
          <div className="p-2.5 rounded-lg bg-muted dark:bg-neutral-800 text-primary transition-colors group-hover:bg-primary/10">
            <IconBuildingStore className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">POS</p>
            <p className="text-xs text-muted-foreground">
              Point of sale transactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background dark:bg-[#121212] p-4 text-left hover:border-primary/50 transition-colors group">
          <div className="p-2.5 rounded-lg bg-muted dark:bg-neutral-800 text-primary transition-colors group-hover:bg-primary/10">
            <IconTruckDelivery className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Suppliers</p>
            <p className="text-xs text-muted-foreground">
              Manage supplier relationships
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background dark:bg-[#121212] p-4 text-left hover:border-primary/50 transition-colors group">
          <div className="p-2.5 rounded-lg bg-muted dark:bg-neutral-800 text-primary transition-colors group-hover:bg-primary/10">
            <IconBriefcase className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Finance</p>
            <p className="text-xs text-muted-foreground">
              Manage financial records and reports
            </p>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-end pt-4 border-t border-border/40 my-5">

        <Button
          onClick={onNext}
          className="rounded-full h-11 px-8 font-medium shadow-md flex items-center gap-2 group/btn">
          Get Started
          <IconChevronRight className="size-4 group-hover/btn:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
