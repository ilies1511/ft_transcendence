import type { PageModule } from '../router'

const template = /*html*/`
<div class="w-full max-w-4xl mx-auto p-6 md:p-10 space-y-8 text-gray-300">
    <h1 class="text-4xl font-bold text-white text-center">Privacy Policy</h1>
    <p class="text-sm text-center text-gray-400">Last updated: August 15, 2025</p>

    <div class="space-y-6 leading-relaxed">
        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">1. Introduction</h2>
            <p>Welcome to ft_transcendence. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us.</p>
        </section>

        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">2. Information We Collect</h2>
            <p>We collect personal information that you voluntarily provide to us when you register on ft_transcendence. The personal information we collect may include your username, email address, and any other data you provide in your profile. For users signing in via Google, we collect the information provided by Google, such as your name and email address.</p>
        </section>

        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">3. How We Use Your Information</h2>
            <p>We use the information we collect or receive to create and manage your account, to enable user-to-user communications, and to operate and maintain our game service. We may also use your information to send you administrative information, such as updates to our terms and policies.</p>
        </section>

        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">4. Will Your Information Be Shared?</h2>
            <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. Your username and game statistics are publicly visible to other users of the service.</p>
        </section>

        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">5. Your Privacy Rights</h2>
            <p>You may review, change, or terminate your account at any time through the settings page. You have the right to request access to the personal information we collect from you, change that information, or delete it in some circumstances.</p>
        </section>

        <section>
            <h2 class="text-2xl font-semibold text-white mb-2">6. Contact Us</h2>
            <p>If you have questions or comments about this policy, you may contact us through the project's repository or designated channels.</p>
        </section>
    </div>
</div>
`

const PrivacyPage: PageModule = {
    render(root) {
        root.innerHTML = template
    },
}

export default PrivacyPage