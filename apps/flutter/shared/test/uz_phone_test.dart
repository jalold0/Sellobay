import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// `packages/utils/src/phone.ts` bilan bir xil xulqni qulflaydi.
/// Mijoz serverdan boshqacha qaror chiqarsa, foydalanuvchi "noto'g'ri raqam"
/// xabarini ko'radi-yu, raqami aslida to'g'ri bo'ladi (yoki aksincha).
void main() {
  group('normalizeUzPhone', () {
    test('9 ta raqam — kod qo`shiladi', () {
      expect(normalizeUzPhone('901234567'), '+998901234567');
    });

    test('bo`shliq, qavs va tire tashlab yuboriladi', () {
      expect(normalizeUzPhone('+998 (90) 123-45-67'), '+998901234567');
      expect(normalizeUzPhone('90 123 45 67'), '+998901234567');
    });

    test('998 bilan boshlangan 12 raqam', () {
      expect(normalizeUzPhone('998901234567'), '+998901234567');
    });

    test('yaroqsiz uzunlik — null', () {
      expect(normalizeUzPhone('12345'), isNull);
      expect(normalizeUzPhone(''), isNull);
      expect(normalizeUzPhone('+1 415 555 0123'), isNull);
    });

    test('8 bilan boshlangan eski format qabul qilinmaydi', () {
      // 12 raqam, lekin 998 bilan boshlanmaydi.
      expect(normalizeUzPhone('890123456789'), isNull);
    });
  });

  group('isValidUzPhone', () {
    test('to`g`ri raqamlar', () {
      expect(isValidUzPhone('901234567'), isTrue);
      expect(isValidUzPhone('+998 90 123 45 67'), isTrue);
    });

    test('13 raqamli chetki holat normalizatsiyadan o`tadi, lekin YAROQSIZ', () {
      // TS manbasidagi shart aynan ko'chirilgan: `normalizeUzPhone` kiritmani
      // o'zgartirmay qaytaradi, lekin regex uni rad etadi. Mijoz ham, server
      // ham bir xil "yaroqsiz" xulosasiga keladi — muhimi shu.
      expect(normalizeUzPhone('+9981234567890'), '+9981234567890');
      expect(isValidUzPhone('+9981234567890'), isFalse);
    });
  });

  test('formatUzPhone ko`rsatish ko`rinishi', () {
    expect(formatUzPhone('901234567'), '+998 90 123 45 67');
    expect(formatUzPhone('bekor'), isNull);
  });

  group('passwordIssueKey — serverdagi zod sxemasi bilan bir xil', () {
    test('qoidaga mos parol o`tadi', () {
      expect(passwordIssueKey('parol123'), isNull);
    });

    test('8 belgidan qisqa', () {
      expect(passwordIssueKey('abc1234'), 'auth.passwordHint');
    });

    test('faqat raqam yoki faqat harf', () {
      expect(passwordIssueKey('12345678'), 'auth.passwordHint');
      expect(passwordIssueKey('abcdefgh'), 'auth.passwordHint');
    });
  });

  group('otpCodeIssueKey', () {
    test('roppa-rosa 6 ta raqam', () {
      expect(otpCodeIssueKey('123456'), isNull);
      expect(otpCodeIssueKey('12345'), 'auth.codeInvalid');
      expect(otpCodeIssueKey('1234567'), 'auth.codeInvalid');
      expect(otpCodeIssueKey('12a456'), 'auth.codeInvalid');
    });
  });

  group('emailIssueKey', () {
    test('odatiy manzillar o`tadi', () {
      expect(emailIssueKey('user@mail.uz'), isNull);
      expect(emailIssueKey('  user.name+tag@sub.example.com '), isNull);
    });

    test('@ yoki domen nuqtasi yo`q', () {
      expect(emailIssueKey('user'), isNotNull);
      expect(emailIssueKey('user@mail'), isNotNull);
      expect(emailIssueKey('@mail.uz'), isNotNull);
    });
  });
}
