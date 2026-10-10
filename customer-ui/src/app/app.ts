
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CustomerService } from './customer.service';
import { Customer, CustomerInput } from './customer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  customers: Customer[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  editingId: number | null = null;

  form: CustomerInput = {
    name: '',
    address_line1: '',
    address_line2: null,
    city: '',
    state: '',
    zip: ''
  };

  constructor(private customerService: CustomerService) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.customerService.getAll().subscribe({
      next: (data: Customer[]) => {
        this.customers = data;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage =
          'Could not load customers. Make sure FastAPI is running.';
        console.error('Load customers failed:', error);
      }
    });
  }

  saveCustomer(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const data: CustomerInput = {
      ...this.form,
      name: this.form.name.trim(),
      address_line1: this.form.address_line1.trim(),
      address_line2: this.form.address_line2?.trim() || null,
      city: this.form.city.trim(),
      state: this.form.state.trim(),
      zip: this.form.zip.trim()
    };

    if (
      !data.name ||
      !data.address_line1 ||
      !data.city ||
      !data.state ||
      !data.zip
    ) {
      this.errorMessage = 'Please complete all required fields.';
      return;
    }

    const request =
      this.editingId === null
        ? this.customerService.create(data)
        : this.customerService.update(this.editingId, data);

    request.subscribe({
      next: () => {
        this.successMessage =
          this.editingId === null
            ? 'Customer added successfully.'
            : 'Customer updated successfully.';

        this.clearForm(false);
        this.loadCustomers();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = 'Could not save customer. Please try again.';
        console.error('Save customer failed:', error);
      }
    });
  }

  editCustomer(customer: Customer): void {
    this.editingId = customer.customer_id;

    this.form = {
      name: customer.name,
      address_line1: customer.address_line1,
      address_line2: customer.address_line2 ?? null,
      city: customer.city,
      state: customer.state,
      zip: customer.zip
    };

    this.errorMessage = '';
    this.successMessage = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteCustomer(id: number): void {
    const confirmed = window.confirm(
      'Are you sure you want to delete this customer?'
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.customerService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Customer deleted successfully.';
        this.loadCustomers();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = 'Could not delete customer.';
        console.error('Delete customer failed:', error);
      }
    });
  }

  clearForm(clearMessages: boolean = true): void {
    this.editingId = null;

    this.form = {
      name: '',
      address_line1: '',
      address_line2: null,
      city: '',
      state: '',
      zip: ''
    };

    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }
}
