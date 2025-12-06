
import React from 'react';
import type { Subscription, PlanType } from '../types';
import { GlassCard } from './ui/GlassCard';
import { Button } from './ui/Button';
import { CheckCircle } from 'lucide-react';

interface BillingProps {
    subscription: Subscription;
    onPlanChange: (newPlan: PlanType) => void;
}

const PlanCard: React.FC<{
    plan: PlanType;
    title: string;
    price: string;
    features: string[];
    isCurrent: boolean;
    onSelect: (plan: PlanType) => void;
}> = ({ plan, title, price, features, isCurrent, onSelect }) => (
    <GlassCard className={`p-6 flex flex-col border-2 ${isCurrent ? 'border-cyan-500' : 'border-transparent'}`}>
        <h3 className="text-xl font-bold text-cyan-400">{title}</h3>
        <p className="text-4xl font-extrabold text-white mt-2">{price}<span className="text-base font-medium text-gray-400">/month</span></p>
        <ul className="space-y-3 mt-6 text-gray-300 flex-1">
            {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-cyan-400" /> {feature}
                </li>
            ))}
        </ul>
        <Button 
            variant={isCurrent ? 'secondary' : 'primary'} 
            className="mt-8 w-full"
            onClick={() => onSelect(plan)}
            disabled={isCurrent}
        >
            {isCurrent ? 'Current Plan' : 'Choose Plan'}
        </Button>
    </GlassCard>
);


export const Billing: React.FC<BillingProps> = ({ subscription, onPlanChange }) => {
    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Manage Your Subscription</h2>
            <div className="grid md:grid-cols-3 gap-6">
                <PlanCard 
                    plan="free"
                    title="Free"
                    price="$0"
                    features={["1 episode per month", "10-minute limit", "Basic voices"]}
                    isCurrent={subscription.planType === 'free'}
                    onSelect={onPlanChange}
                />
                <PlanCard 
                    plan="pro"
                    title="Pro"
                    price="$29"
                    features={["10 episodes per month", "30-minute limit", "Premium voices", "Priority support"]}
                    isCurrent={subscription.planType === 'pro'}
                    onSelect={onPlanChange}
                />
                <PlanCard 
                    plan="business"
                    title="Business"
                    price="$99"
                    features={["Unlimited episodes", "No time limits", "All voices & features", "Dedicated support"]}
                    isCurrent={subscription.planType === 'business'}
                    onSelect={onPlanChange}
                />
            </div>
             <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-white">Pay-as-you-go Credits</h3>
                <p className="text-gray-400 mt-2">Need more flexibility? Top up your credits anytime.</p>
                <div className="flex items-center justify-between mt-4">
                    <p className="text-gray-200">1 credit = 1 minute of generated audio</p>
                    <Button variant="secondary">Buy Credits</Button>
                </div>
             </GlassCard>
        </div>
    );
};
