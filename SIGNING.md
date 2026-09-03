# Podpisywanie wydań Frame Lab

Konfiguracja jest przygotowana, ale pełny przebieg nie był uruchomiony: brakuje kont i certyfikatów wydawcy. Obecne instalatory są testowe, nie stanowią podpisanego wydania publicznego.

Nie zapisuj haseł ani kluczy w repozytorium i nie wklejaj ich do rozmowy. Użyj bezpiecznego magazynu sekretów lub lokalnego środowiska procesu budowania.

## macOS

Właściciel musi uruchomić konto Apple Developer, uzyskać certyfikat **Developer ID Application** z kluczem prywatnym i dostęp do notaryzacji.

Konfiguracja certyfikatu: `CSC_LINK`, `CSC_KEY_PASSWORD`. Notaryzacja wymaga jednego z zestawów:

- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`;
- `APPLE_API_KEY` (lokalna ścieżka), `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`.

Następnie na Macu: `pnpm release:mac`. Skrypt wymaga podpisu i notaryzacji oraz sprawdza podpis, załączony bilet Apple i ocenę Gatekeeper. Bez poświadczeń zatrzymuje się przed budowaniem.

## Windows

Potrzebny jest zweryfikowany wydawca i certyfikat podpisywania kodu albo Microsoft Artifact Signing. Samo konto Microsoft nie wystarcza. Wybór dostawcy i ewentualny zakup należą do właściciela.

Obsługiwane konfiguracje:

- certyfikat udostępniony przez `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`;
- Artifact Signing: `FRAME_LAB_SIGNING_ENDPOINT`, `FRAME_LAB_SIGNING_ACCOUNT`, `FRAME_LAB_SIGNING_PROFILE`, `FRAME_LAB_SIGNING_PUBLISHER` oraz `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`.

Następnie na Windowsie: `pnpm release:win`. Skrypt sprawdza Authenticode wszystkich plików EXE. Certyfikaty sprzętowe wymagają osobnego dopasowania konfiguracji; nie należy eksportować klucza, którego dostawca nie pozwala eksportować.

## Wydawanie

- Podpisane pliki trafiają do `dist-signed`, testowe do `dist`.
- Nic nie jest publikowane na stronie ani w GitHub Releases. Notaryzacja przesyła podpisaną aplikację do Apple do weryfikacji.
- Workflow GitHub buduje wyłącznie artefakty testowe i nie publikuje wydań.
- Po podpisaniu trzeba przetestować pobrany instalator na innym komputerze. Nowa aplikacja Windows może pokazywać ostrzeżenie SmartScreen mimo prawidłowego podpisu.
- Konto i połączenie z usługami są potrzebne do wydawania; aplikacja dla użytkownika pozostaje offline.

Konfiguracja jest dostosowana do przypiętej wersji electron-builder 26.15.3. Podpisane wydanie musi przejść ponowne testy po uruchomieniu kont.

Źródła: [Apple Developer ID](https://developer.apple.com/support/developer-id/), [electron-builder v26 macOS](https://www.electron.build/v26/docs/mac/), [Microsoft SmartScreen](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).
