
type GamePassword = 'Game' | 'Tournament';

// takes a text input from the user somehow
export async function get_password_from_user(category: GamePassword): Promise<string> {
	if (category == 'Game') {
		return ("Placeholder lobby password");
	} else {
		return ("Placeholder tournament password");
	}
}
