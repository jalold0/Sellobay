import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'address_form_screen.dart';

/// Saqlangan manzillar.
///
/// Ilgari manzillarni FAQAT checkout o'qiy olardi — yangisini qo'shish
/// yoki eskisini tuzatish uchun ilovada joy yo'q edi.
class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  List<SavedAddress>? _items;
  Object? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  AddressRepository get _repo => SellobayRuntimeScope.of(context).addresses;

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final items = await _repo.fetchAll();
      if (!mounted) return;
      setState(() => _items = items);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _openForm([SavedAddress? existing]) async {
    final saved = await Navigator.of(context).push<SavedAddress>(
      MaterialPageRoute(builder: (_) => AddressFormScreen(existing: existing)),
    );
    if (saved == null || !mounted) return;
    _toast(
      context.t(existing == null
          ? 'profile.addressesPage.added'
          : 'profile.addressesPage.saved'),
    );
    // Asosiy manzil o'zgargan bo'lsa boshqalarinikini SERVER oldi —
    // shuning uchun bitta yozuvni almashtirmay, ro'yxatni qayta olamiz.
    await _load();
  }

  Future<void> _setDefault(SavedAddress address) async {
    setState(() => _busy = true);
    try {
      await _repo.setDefault(address.id);
      if (!mounted) return;
      _toast(context.t('profile.addressesPage.defaultUpdated'));
    } catch (e) {
      if (!mounted) return;
      _toast(context.errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    if (mounted) await _load();
  }

  Future<void> _delete(SavedAddress address) async {
    final name = address.label?.isNotEmpty == true ? address.label! : address.oneLine;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        content: Text(
          dialogContext.t('profile.addressesPage.deleteConfirm', params: {'label': name}),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(dialogContext.t('common.cancel')),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: SellobayColors.destructive),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(dialogContext.t('common.delete')),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await _repo.delete(address.id);
      if (!mounted) return;
      _toast(context.t('profile.addressesPage.deleted'));
    } catch (e) {
      if (!mounted) return;
      _toast(context.errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    if (mounted) await _load();
  }

  void _toast(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.t('profile.addressesPage.title'))),
      body: RefreshIndicator(onRefresh: _load, child: _body(context)),
      // Pastki panel — savat va checkout bilan bir xil naqsh.
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton.icon(
            onPressed: _busy ? null : () => _openForm(),
            icon: const Icon(Icons.add, size: 20),
            label: Text(context.t('profile.addressesPage.addAddress')),
          ),
        ),
      ),
    );
  }

  Widget _body(BuildContext context) {
    if (_error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(32),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.18),
          const Icon(Icons.cloud_off, size: 42, color: SellobayColors.mutedText),
          const SizedBox(height: 14),
          Text(
            context.errorText(_error!),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 18),
          Center(
            child: FilledButton(onPressed: _load, child: Text(context.t('common.retry'))),
          ),
        ],
      );
    }

    final items = _items;
    if (items == null) {
      return const Center(
        child: SizedBox(
          width: 26,
          height: 26,
          child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
        ),
      );
    }

    if (items.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(32),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.18),
          Text(
            context.t('profile.addressesPage.emptyTitle'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            context.t('profile.addressesPage.emptyDesc'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13.5, color: SellobayColors.mutedText),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _card(context, items[i]),
    );
  }

  Widget _card(BuildContext context, SavedAddress address) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
      decoration: BoxDecoration(
        border: Border.all(
          color: address.isDefault ? SellobayColors.primary : SellobayColors.border,
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  address.label?.isNotEmpty == true
                      ? address.label!
                      : context.t(address.type.labelKey),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: SellobayColors.ink,
                  ),
                ),
              ),
              if (address.isDefault)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                  decoration: BoxDecoration(
                    color: SellobayColors.primary.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    context.t('profile.addressesPage.defaultBadge'),
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: SellobayColors.primary,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            address.oneLine,
            style: const TextStyle(fontSize: 13.5, height: 1.4, color: SellobayColors.ink),
          ),
          const SizedBox(height: 2),
          Text(
            '${address.recipientName} · ${address.phone}',
            style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
          ),
          Row(
            children: [
              if (!address.isDefault)
                TextButton(
                  onPressed: _busy ? null : () => _setDefault(address),
                  child: Text(context.t('profile.addressesPage.makeDefault')),
                ),
              const Spacer(),
              IconButton(
                tooltip: context.t('common.edit'),
                onPressed: _busy ? null : () => _openForm(address),
                icon: const Icon(Icons.edit_outlined, size: 20),
              ),
              IconButton(
                tooltip: context.t('common.delete'),
                onPressed: _busy ? null : () => _delete(address),
                color: SellobayColors.destructive,
                icon: const Icon(Icons.delete_outline, size: 20),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
