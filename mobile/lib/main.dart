import 'package:flutter/material.dart';

const urbanBlue = Color(0xFF2446E8);

void main() => runApp(const UrbanStepApp());

class UrbanStepApp extends StatelessWidget {
  const UrbanStepApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'UrbanStep',
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: urbanBlue),
          scaffoldBackgroundColor: const Color(0xFFF7F9FC),
          fontFamily: 'Arial',
        ),
        home: const MobileShell(),
      );
}

class MobileShell extends StatefulWidget {
  const MobileShell({super.key});
  @override State<MobileShell> createState() => _MobileShellState();
}

class _MobileShellState extends State<MobileShell> {
  int index = 0;
  final pages = const [HomePage(), CategoriesPage(), CartPage(), ProfilePage()];
  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(child: pages[index]),
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (value) => setState(() => index = value),
          indicatorColor: urbanBlue.withValues(alpha: .12),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home, color: urbanBlue), label: 'Home'),
            NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view, color: urbanBlue), label: 'Categories'),
            NavigationDestination(icon: Icon(Icons.shopping_bag_outlined), selectedIcon: Icon(Icons.shopping_bag, color: urbanBlue), label: 'Cart'),
            NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person, color: urbanBlue), label: 'Profile'),
          ],
        ),
      );
}

class PageHeader extends StatelessWidget {
  final String title;
  const PageHeader(this.title, {super.key});
  @override Widget build(BuildContext context) => Row(children: [
    const Text('Urban', style: TextStyle(fontSize: 23, fontWeight: FontWeight.w900)),
    const Text('Step', style: TextStyle(fontSize: 23, fontWeight: FontWeight.w900, color: urbanBlue)),
    const Spacer(), IconButton(onPressed: () {}, icon: const Icon(Icons.notifications_none)),
  ]);
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});
  @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(18), children: [
    const PageHeader('Home'),
    const SizedBox(height: 18),
    Container(padding: const EdgeInsets.all(22), decoration: BoxDecoration(color: urbanBlue, borderRadius: BorderRadius.circular(28)), child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('STYLE THAT MOVES', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.4)),
      SizedBox(height: 8), Text('With you.', style: TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900)),
      SizedBox(height: 10), Text('Discover fashion from independent sellers across Nigeria.', style: TextStyle(color: Colors.white70, height: 1.4)),
      SizedBox(height: 18), Chip(label: Text('Explore collection', style: TextStyle(color: urbanBlue, fontWeight: FontWeight.bold)), backgroundColor: Colors.white),
    ])),
    const SizedBox(height: 22),
    const Text('Shop by category', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
    const SizedBox(height: 12),
    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: const [CategoryIcon('Men', Icons.man), CategoryIcon('Women', Icons.woman), CategoryIcon('Shoes', Icons.directions_run), CategoryIcon('Kids', Icons.child_care)]),
    const SizedBox(height: 24),
    const Text('Trending now', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
    const SizedBox(height: 12),
    const Row(children: [Expanded(child: ProductCard(name: 'Everyday sneakers', price: '₦38,000', icon: Icons.directions_run)), SizedBox(width: 12), Expanded(child: ProductCard(name: 'Essential tote', price: '₦22,500', icon: Icons.shopping_bag))]),
  ]);
}

class CategoryIcon extends StatelessWidget { final String label; final IconData icon; const CategoryIcon(this.label, this.icon, {super.key}); @override Widget build(BuildContext context) => Column(children: [CircleAvatar(radius: 28, backgroundColor: urbanBlue.withValues(alpha: .1), child: Icon(icon, color: urbanBlue)), const SizedBox(height: 7), Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))]); }
class ProductCard extends StatelessWidget { final String name, price; final IconData icon; const ProductCard({required this.name, required this.price, required this.icon, super.key}); @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFE8ECF4))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Container(height: 120, decoration: BoxDecoration(color: const Color(0xFFEFF3FF), borderRadius: BorderRadius.circular(15)), child: Center(child: Icon(icon, size: 58, color: urbanBlue))), const SizedBox(height: 10), Text(name, style: const TextStyle(fontWeight: FontWeight.w700)), const SizedBox(height: 5), Text(price, style: const TextStyle(color: urbanBlue, fontWeight: FontWeight.w900))])); }

class CategoriesPage extends StatelessWidget { const CategoriesPage({super.key}); @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(18), children: [const PageHeader('Categories'), const SizedBox(height: 20), ...['Men', 'Women', 'Kids', 'Footwear', 'Accessories'].map((x) => Card(child: ListTile(leading: const Icon(Icons.grid_view, color: urbanBlue), title: Text(x, style: const TextStyle(fontWeight: FontWeight.w700)), trailing: const Icon(Icons.chevron_right))))]); }
class CartPage extends StatelessWidget { const CartPage({super.key}); @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(18), children: [const PageHeader('Cart'), const SizedBox(height: 20), const ProductCard(name: 'Everyday sneakers', price: '₦38,000', icon: Icons.directions_run), const SizedBox(height: 18), Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: const [Text('Subtotal', style: TextStyle(fontWeight: FontWeight.w700)), Text('₦38,000', style: TextStyle(fontWeight: FontWeight.w900))]), const SizedBox(height: 15), FilledButton(onPressed: () {}, style: FilledButton.styleFrom(backgroundColor: urbanBlue, minimumSize: const Size.fromHeight(52)), child: const Text('Proceed to checkout'))]); }
class ProfilePage extends StatelessWidget { const ProfilePage({super.key}); @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(18), children: [const PageHeader('Profile'), const SizedBox(height: 22), const CircleAvatar(radius: 38, backgroundColor: Color(0xFFE8EDFF), child: Icon(Icons.person, color: urbanBlue, size: 38)), const SizedBox(height: 12), const Center(child: Text('Welcome to UrbanStep', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900))), const SizedBox(height: 25), ...['My orders', 'Saved items', 'Addresses', 'Help & support', 'Sign out'].map((x) => Card(child: ListTile(title: Text(x), trailing: const Icon(Icons.chevron_right))))]); }
