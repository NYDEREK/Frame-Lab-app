# Frame Lab Desktop

Desktopowa wersja Frame Lab dla macOS i Windows. Aplikacja zawiera frontend, generator 3D i lokalny serwer, więc po instalacji nie wymaga hostingu ani dostępu do internetu.

Rejestracja odbywa się wyłącznie lokalnie i wymaga jednego ze stałych, wielokrotnego użytku kodów aktywacyjnych Frame Lab. Kod roczny ustawia datę końca dostępu na tym komputerze, a kod lifetime nie wygasa. Późniejsze logowanie wymaga już tylko adresu e-mail i hasła użytych podczas lokalnej rejestracji. Integracja z kontami Google została usunięta.

## Jak działa zapis danych

Przy pierwszym uruchomieniu aplikacja kopiuje bazę startową do prywatnego katalogu danych użytkownika. Konta, kolekcje, ustawienia i historia pobrań pozostają na danym komputerze i nie są nadpisywane przy aktualizacji aplikacji.

- macOS: `~/Library/Application Support/Frame Lab/data/frame-lab-db.json`
- Windows: `%APPDATA%\\Frame Lab\\data\\frame-lab-db.json`

## Uruchomienie dla programisty

Wymagane są Node.js 24 i pnpm.

```bash
pnpm install
pnpm start
```

Test serwera oraz pełnego okna aplikacji:

```bash
pnpm test
```

## Instalatory

```bash
# macOS (jeden uniwersalny instalator dla Apple Silicon i Intela)
pnpm run dist:mac

# Windows 64-bit
pnpm run dist:win
```

Gotowe pliki pojawiają się w katalogu `dist/`.

GitHub Actions buduje obie wersje automatycznie po wysłaniu zmian do `main`. Można je pobrać z zakładki **Actions** jako artefakty `frame-lab-macos` i `frame-lab-windows`. Tag w formacie `v0.1.0` dodatkowo tworzy publiczne wydanie w zakładce **Releases**.

## Podpisywanie aplikacji

Obecny workflow tworzy niepodpisane instalatory. Działają one, ale macOS Gatekeeper i Windows SmartScreen mogą wyświetlać ostrzeżenie przy pierwszym uruchomieniu. Do publicznej dystrybucji bez ostrzeżeń trzeba dodać certyfikat Apple Developer ID z notaryzacją oraz certyfikat podpisu kodu dla Windows do sekretów repozytorium.
