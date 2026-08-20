'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'

export default function PricingSection() {
    const t = useTranslations('Pricing')
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')

    const price = billingCycle === 'annual' ? '249.95' : '29.95'
    const period = billingCycle === 'annual' ? t('perYear') : t('perMonth')

    return (
        <section className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center space-y-8">
            <div className="space-y-3">
                <h2 className="text-3xl font-extrabold text-white">{t('title')}</h2>
                <p className="text-slate-400 text-sm">{t('subtitle')}</p>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-center gap-3">
                <span className={`text-xs font-semibold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
                    {t('monthlyBilled')}
                </span>
                <button
                    onClick={() => setBillingCycle(billingCycle === 'annual' ? 'monthly' : 'annual')}
                    className="w-12 h-6 bg-slate-800 rounded-full p-1 relative border border-slate-700 transition cursor-pointer"
                >
                    <div
                        className={`w-4 h-4 rounded-full bg-indigo-500 transition-transform ${billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
                            }`}
                    />
                </button>
                <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold ${billingCycle === 'annual' ? 'text-white' : 'text-slate-400'}`}>
                        {t('annualBilled')}
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full">
                        {t('saveBadge')}
                    </span>
                </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-slate-900/90 border-2 border-indigo-500/50 rounded-2xl p-8 max-w-lg mx-auto space-y-6 shadow-2xl relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wider uppercase">
                    {billingCycle === 'annual' ? t('annualCardTitle') : t('monthlyCardTitle')}
                </div>

                <div className="space-y-2 pt-2">
                    <h3 className="text-xl font-bold text-white">{t('locationLicense')}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-extrabold text-white">${price}</span>
                        <span className="text-slate-400 text-sm">{period}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                        {billingCycle === 'annual' ? t('annualEquivalent') : t('monthlyEquivalent')}
                    </p>
                </div>

                <ul className="text-left space-y-3 text-sm text-slate-300 border-t border-b border-slate-800 py-6">
                    <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{t('unlimitedDrafts')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{t('apiSync')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{t('languagesCount')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{t('seoOpt')}</span>
                    </li>
                </ul>

                <Link
                    href="/login"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-indigo-600/30 block"
                >
                    {t('cta')}
                </Link>
            </div>
        </section>
    )
}