import React from 'react';
import Link from 'next/link';
import { Shield, Lock } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/features/LandingContent';

export default function LegalPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-12">
                <div className="max-w-4xl mx-auto space-y-16">

                    {/* Header Section */}
                    <div className="text-center space-y-4 mb-16">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                            Privacy Policy & <br className="hidden md:block" /> Intellectual Property
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            We believe in transparency and protecting your rights. Please read our terms carefully to understand how we operate.
                        </p>
                        <div className="flex justify-center gap-2 text-sm text-slate-400">
                            <span>Last Updated: December 27, 2025</span>
                        </div>
                    </div>

                    {/* Privacy Policy Section */}
                    <section id="privacy" className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-start/5 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <Lock className="w-6 h-6 text-blue-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900">Privacy Policy</h2>
                        </div>

                        <div className="space-y-8 text-slate-600 leading-relaxed">
                            <div className="prose prose-slate max-w-none">
                                <p>
                                    ScriptishRx Wellness Guide (“ScriptishRx,” “we,” “our,” or “us”) is committed to safeguarding your privacy and protecting your personal information. This Privacy Policy describes how we collect, use, and protect information obtained through our AI-powered subscription platform.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="bg-slate-50 p-6 rounded-2xl">
                                    <h3 className="font-bold text-slate-900 mb-3 text-lg">Information Collection</h3>
                                    <p className="text-sm">
                                        We collect personal information that you voluntarily provide, such as when you subscribe to our services, submit inquiries, or communicate with us. This information may include your name, email address, organization details, and other relevant contact or business information.
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-2xl">
                                    <h3 className="font-bold text-slate-900 mb-3 text-lg">Use of Information</h3>
                                    <p className="text-sm">
                                        We use the information we collect to deliver personalized AI-enhanced business solutions, improve our services, and communicate with you regarding your account, updates, or features. We do not sell, rent, or trade your personal information to any third parties. Access to your information is restricted to authorized personnel who require it for legitimate business purposes.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 text-xl">Data Security</h3>
                                <p>
                                    We implement appropriate technical and organizational security measures designed to protect your personal data against unauthorized access, disclosure, alteration, or destruction. However, please note that no method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.
                                </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-blue-900">Questions or Concerns?</h4>
                                    <p className="text-blue-700 text-sm">Contact us regarding your personal data.</p>
                                </div>
                                <a href="mailto:info@scriptishrx.com" className="px-6 py-2 bg-white text-blue-600 font-semibold rounded-lg shadow-sm hover:shadow-md transition-all">
                                    info@scriptishrx.com
                                </a>
                            </div>
                        </div>
                    </section>

                    {/* Intellectual Property Section */}
                    <section id="ip-rights" className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-purple-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900">Intellectual Property Rights</h2>
                        </div>

                        <div className="space-y-10 text-slate-600 leading-relaxed">

                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 text-xl flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Ownership
                                </h3>
                                <p>
                                    All content, features, and functionality of the ScriptishRx Wellness Guide platform—including but not limited to text, graphics, logos, icons, images, audio or video materials, data compilations, digital downloads, and software—are the sole and exclusive property of ScriptishRx or its licensors. These materials are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 text-xl flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Trademarks
                                </h3>
                                <p>
                                    The ScriptishRx name, logo, and all related names, designs, service names, and slogans are trademarks owned or licensed by ScriptishRx. Any unauthorized use, reproduction, or imitation of these trademarks is strictly prohibited without prior written consent from ScriptishRx.
                                </p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                                <h3 className="font-bold text-slate-900 text-xl mb-4">License to Use</h3>
                                <p className="mb-4">
                                    ScriptishRx grants users a limited, non-exclusive, non-transferable, and revocable license to access and use our platform solely for lawful subscription purposes. This license does not permit:
                                </p>
                                <ul className="space-y-3 list-none pl-0">
                                    {[
                                        "The resale or commercial exploitation of our services or content.",
                                        "The copying, redistribution, or modification of platform materials.",
                                        "The creation of derivative works based on our proprietary systems or AI outputs."
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-red-500 font-bold text-xs">✕</span>
                                            </div>
                                            <span className="text-slate-700">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-6 text-sm font-semibold text-red-500/80">
                                    Any unauthorized use terminates the license granted by ScriptishRx and may result in legal action.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg mb-2">AI-Generated Content</h3>
                                    <p className="text-sm">
                                        AI-generated outputs provided through the ScriptishRx platform are produced using proprietary artificial intelligence technologies. You may use such outputs for legitimate business purposes in accordance with your subscription terms. Access or use of these AI features outside a valid subscription agreement is expressly prohibited.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg mb-2">User Content</h3>
                                    <p className="text-sm">
                                        By submitting content to our platform, you grant ScriptishRx a worldwide, royalty-free, non-exclusive license to use, reproduce, adapt, and display such content solely for the purpose of providing and improving our services. You retain full ownership of your original materials and intellectual property.
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-8 mt-8">
                                <h3 className="font-bold text-slate-900 text-lg mb-4">Copyright Infringement & Dispute Resolution</h3>
                                <p className="mb-4">
                                    ScriptishRx respects the intellectual property rights of others. If you believe that any material on our platform infringes upon your copyright, please contact us at <a href="mailto:info@scriptishrx.com" className="text-primary-start font-medium hover:underline">info@scriptishrx.com</a> with a detailed description of the alleged infringement, including evidence of ownership and relevant supporting materials.
                                </p>
                                <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm font-medium border border-green-100">
                                    Disclaimer: By subscribing to or using the ScriptishRx AI-powered platform, you agree to resolve any disputes related to its use in a fair and amicable manner before seeking any formal legal remedy.
                                </div>
                            </div>

                        </div>
                    </section>

                </div>
            </main>

            <Footer />
        </div>
    );
}
