import type { PageModule } from '../router'

const template = /*html*/`
<div class="w-full max-w-4xl mx-auto p-6 md:p-10 space-y-8 text-gray-300">
    <h1 class="text-4xl font-bold text-white text-center">Terms of Service</h1>
    <p class="text-sm text-center text-gray-400">Last updated: August 15, 2025</p>

    <div class="space-y-6 leading-relaxed">
        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">1. Agreement to Terms</h2>
            <p>By using our service, ft_transcendence, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service. This is a 42 school project and is not intended for commercial use.</p>
        </section>

        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">2. User Accounts</h2>
            <p>You are responsible for safeguarding your account and for any activities or actions under your account. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>
        </section>

        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">3. User Conduct</h2>
            <p>You agree not to use the service to post or transmit any content that is illegal, threatening, defamatory, or obscene. We reserve the right to terminate accounts that violate these rules of conduct.</p>
        </section>

        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">4. Termination</h2>
            <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the service will immediately cease.</p>
        </section>

        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">5. Disclaimer</h2>
            <p>The service is provided on an "AS IS" and "AS AVAILABLE" basis. The service is provided without warranties of any kind, whether express or implied. As a student project, stability and data persistence are not guaranteed.</p>
        </section>

        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">6. Changes to Terms</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect.</p>
        </section>
    </div>
</div>
`

const TermsPage: PageModule = {
    render(root) {
        root.innerHTML = template
    },
}

export default TermsPage